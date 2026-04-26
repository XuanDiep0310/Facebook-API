/**
 * kafkaProducer.js
 *
 * Kafka producer với mock fallback:
 * - Khi KAFKA_BROKERS không có broker thực → ghi ra console + file kafka_mock.log
 * - Khi có broker → publish message thật vào topic
 */

import { Kafka, logLevel } from 'kafkajs';
import { createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_LOG_PATH = join(__dirname, '..', '..', 'kafka_mock.log');

// ─── Trạng thái kết nối ──────────────────────────────────────────────────────
let producer = null;
let isMockMode = false;
let mockLogStream = null;

// ─── Khởi tạo mock log file ──────────────────────────────────────────────────
function getMockLogStream() {
  if (!mockLogStream) {
    mockLogStream = createWriteStream(MOCK_LOG_PATH, { flags: 'a' });
  }
  return mockLogStream;
}

// ─── Kết nối Kafka ───────────────────────────────────────────────────────────
export async function connectProducer() {
  const kafka = new Kafka({
    clientId: 'webhook-service',
    brokers: config.kafkaBrokers,
    logLevel: logLevel.WARN,
    // Timeout ngắn để fallback nhanh khi không có broker
    connectionTimeout: 3000,
    requestTimeout: 5000,
    retry: {
      initialRetryTime: 300,
      retries: 2,
    },
  });

  producer = kafka.producer();

  try {
    await producer.connect();
    console.log(`[kafka] Connected to broker(s): ${config.kafkaBrokers.join(', ')}`);
    console.log(`[kafka] Publishing to topic: "${config.kafkaTopicRawEvents}"`);
    isMockMode = false;
  } catch (err) {
    console.warn(`[kafka] Cannot connect to broker — switching to MOCK mode`);
    console.warn(`[kafka] Mock messages will be logged to: ${MOCK_LOG_PATH}`);
    isMockMode = true;
    producer = null;
  }
}

// ─── Publish event ───────────────────────────────────────────────────────────
/**
 * @param {string} topic   - Tên Kafka topic
 * @param {string} key     - Message key (thường là eventId)
 * @param {object} value   - Payload object (sẽ được JSON.stringify)
 */
export async function publishEvent(topic, key, value) {
  const payload = {
    topic,
    key,
    value: JSON.stringify(value),
    timestamp: new Date().toISOString(),
  };

  if (isMockMode || !producer) {
    // Mock mode: ghi ra console + file
    const logLine = JSON.stringify(payload) + '\n';
    console.log('[kafka:mock] ─────────────────────────────────────────────');
    console.log(`[kafka:mock] topic   : ${topic}`);
    console.log(`[kafka:mock] key     : ${key}`);
    console.log(`[kafka:mock] payload : ${payload.value}`);
    getMockLogStream().write(logLine);
    return { mock: true };
  }

  // Real Kafka
  await producer.send({
    topic,
    messages: [
      {
        key: String(key),
        value: payload.value,
      },
    ],
  });

  console.log(`[kafka] Published → topic="${topic}" key="${key}"`);
  return { mock: false };
}

// ─── Graceful shutdown ───────────────────────────────────────────────────────
export async function disconnectProducer() {
  if (producer) {
    await producer.disconnect();
    console.log('[kafka] Producer disconnected');
  }
  if (mockLogStream) {
    mockLogStream.end();
  }
}
