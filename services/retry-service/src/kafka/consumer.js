import { Kafka } from 'kafkajs';
import { config } from '../config.js';
import { publishToRetry, publishToDeadLetter } from './producer.js';

const kafka = new Kafka({
  clientId: 'retry-service-consumer',
  brokers: config.kafkaBrokers
});

const consumer = kafka.consumer({ groupId: 'retry-service-group' });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function handleFailedMessage(payload) {
  const { command_id, retry_count = 0 } = payload;
  
  if (retry_count < config.maxRetry) {
    const waitMs = 1000 * Math.pow(2, retry_count);
    console.log(`[kafka:retry] Command ${command_id} failed. Waiting ${waitMs / 1000}s before retry attempt ${retry_count + 1}...`);
    
    // Đợi theo cơ chế Exponential Backoff
    await delay(waitMs);

    const retryPayload = {
      ...payload,
      retry_count: retry_count + 1
    };

    await publishToRetry(retryPayload);
  } else {
    console.warn(`[kafka:retry] Command ${command_id} reached max retry limit (${config.maxRetry}). Moving to Dead Letter Queue.`);
    await publishToDeadLetter(payload);
  }
}

export async function startKafkaConsumer() {
  await consumer.connect();
  console.log('[kafka:retry] Consumer connected.');

  await consumer.subscribe({ topic: 'send_failed', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const valueStr = message.value.toString();
      console.log(`[kafka:retry] Received failed command: ${valueStr}`);
      
      try {
        const payload = JSON.parse(valueStr);
        // Xử lý retry async không block luồng nhận message tiếp theo
        handleFailedMessage(payload).catch((err) => {
          console.error(`[kafka:retry] Error processing retry for command ${payload.command_id}:`, err.message);
        });
      } catch (err) {
        console.error('[kafka:retry] Error parsing message:', err.message);
      }
    }
  });
}
