import { Kafka } from 'kafkajs';
import { config } from '../config.js';

const kafka = new Kafka({
  clientId: 'retry-service-producer',
  brokers: config.kafkaBrokers
});

const producer = kafka.producer();

export async function connectProducer() {
  await producer.connect();
  console.log('[kafka:retry] Producer connected.');
}

export async function publishToRetry(payload) {
  await producer.send({
    topic: 'send_retry',
    messages: [
      {
        key: payload.command_id,
        value: JSON.stringify(payload)
      }
    ]
  });
  console.log(`[kafka:retry] Published to send_retry for command ${payload.command_id} (attempt ${payload.retry_count})`);
}

export async function publishToDeadLetter(payload) {
  await producer.send({
    topic: 'dead_letter',
    messages: [
      {
        key: payload.command_id,
        value: JSON.stringify(payload)
      }
    ]
  });
  console.log(`[kafka:retry] Published to dead_letter for command ${payload.command_id} (retry limit reached)`);
}

export async function disconnectProducer() {
  await producer.disconnect();
}
