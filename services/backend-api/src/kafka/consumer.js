import { Kafka } from 'kafkajs';
import { config } from '../config.js';
import logger from '../middleware/logger.js';
import { isCommandProcessed, saveCommandProcessed } from '../db/idempotency.js';
import db from '../db/index.js';
import { graphPost } from '../services/graphApi.js';

const kafka = new Kafka({
  clientId: 'backend-api-consumer',
  brokers: config.kafkaBrokers
});

const consumer = kafka.consumer({ groupId: 'backend-api-group' });
const producer = kafka.producer();

// Hàm xử lý một command reply / action gửi lên Facebook
async function handleCommand(payload) {
  const { command_id, comment_id, action, message, retry_count = 0 } = payload;
  
  if (!command_id) {
    logger.warn(`Received command without command_id: ${JSON.stringify(payload)}`);
    return;
  }

  // 1. Kiểm tra tính Idempotent
  const processed = await isCommandProcessed(command_id);
  if (processed) {
    logger.info(`Command ${command_id} was already processed. Skipping.`);
    return;
  }

  try {
    logger.info(`Processing command ${command_id}: ${action} on comment ${comment_id}`);
    
    // 2. Thực hiện hành động gọi Facebook Graph API
    if (action === 'reply') {
      await graphPost(`/${comment_id}/comments`, { message });
      // Cập nhật trạng thái comment trong DB
      await db.query(
        "UPDATE comments SET status = 'replied' WHERE comment_id = $1",
        [comment_id]
      );
    } else if (action === 'hide') {
      await graphPost(`/${comment_id}`, { is_hidden: 'true' });
      await db.query(
        "UPDATE comments SET status = 'hidden' WHERE comment_id = $1",
        [comment_id]
      );
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    // 3. Xử lý thành công -> lưu idempotency key
    await saveCommandProcessed(command_id, 'success');
    logger.info(`Successfully executed command ${command_id}`);

  } catch (err) {
    logger.error(`Failed to execute command ${command_id}: ${err.message}`);

    // Nếu lỗi do token hoặc các lỗi 4xx không thể phục hồi thì lưu luôn là failed để tránh retry vô ích
    const isUnrecoverable = err.status && err.status >= 400 && err.status < 500;
    
    if (isUnrecoverable) {
      logger.warn(`Unrecoverable error for command ${command_id}. Marking as failed in DB.`);
      await saveCommandProcessed(command_id, 'failed_unrecoverable');
      await db.query(
        "UPDATE comments SET status = 'failed' WHERE comment_id = $1",
        [comment_id]
      );
      return;
    }

    // 4. Lỗi tạm thời (5xx, timeout...) -> publish sang topic send_failed
    try {
      logger.info(`Publishing failed command ${command_id} to send_failed topic (attempt ${retry_count})`);
      await producer.send({
        topic: 'send_failed',
        messages: [
          {
            key: command_id,
            value: JSON.stringify({
              ...payload,
              retry_count,
              error: err.message
            })
          }
        ]
      });
    } catch (pubErr) {
      logger.error(`Fatal: Failed to publish command ${command_id} to send_failed topic: ${pubErr.message}`);
    }
  }
}

export async function startKafkaConsumer() {
  await consumer.connect();
  await producer.connect();
  
  logger.info('Kafka consumer connected.');

  await consumer.subscribe({ topics: ['reply_commands', 'send_retry'], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const valueStr = message.value.toString();
      logger.info(`Received message on topic ${topic}: ${valueStr}`);
      
      try {
        const payload = JSON.parse(valueStr);
        await handleCommand(payload);
      } catch (err) {
        logger.error(`Error parsing message: ${err.message}`);
      }
    }
  });
}
