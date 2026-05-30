import { Kafka } from 'kafkajs';
import { config } from '../config.js';

const kafka = new Kafka({
  clientId: 'core-service-producer',
  brokers: config.kafkaBrokers
});

const producer = kafka.producer();

export async function connectProducer() {
  await producer.connect();
  console.log('[kafka:core] Producer connected.');
}

export async function publishReplyCommand(commandId, commentId, pageId, action, message = '') {
  const payload = {
    command_id: commandId,
    comment_id: commentId,
    page_id: pageId,
    action,
    message,
    retry_count: 0
  };

  await producer.send({
    topic: 'reply_commands',
    messages: [
      {
        key: commandId,
        value: JSON.stringify(payload)
      }
    ]
  });
  console.log(`[kafka:core] Published reply command ${commandId} (action: ${action}) for comment ${commentId}`);
}

export async function disconnectProducer() {
  await producer.disconnect();
}
