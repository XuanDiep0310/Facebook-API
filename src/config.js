import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // ─── Main API Server ──────────────────────────────────────────────
  port: Number(process.env.PORT) || 3000,
  accessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '',
  graphVersion: process.env.FACEBOOK_GRAPH_VERSION || 'v25.0',

  // ─── Webhook Service ──────────────────────────────────────────────
  webhookPort: Number(process.env.WEBHOOK_PORT) || 3001,
  webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN || '',
  appSecret: process.env.FACEBOOK_APP_SECRET || '',

  // ─── Kafka ────────────────────────────────────────────────────────
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  kafkaTopicRawEvents: process.env.KAFKA_TOPIC_RAW_EVENTS || 'raw_events',
};

if (!config.accessToken) {
  console.warn('[config] Warning: FACEBOOK_PAGE_ACCESS_TOKEN is not set');
}
if (!config.appSecret) {
  console.warn('[config] Warning: FACEBOOK_APP_SECRET is not set — webhook signature verification will be skipped');
}
if (!config.webhookVerifyToken) {
  console.warn('[config] Warning: WEBHOOK_VERIFY_TOKEN is not set');
}
