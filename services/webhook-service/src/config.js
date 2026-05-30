import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3001,
  appSecret: process.env.FACEBOOK_APP_SECRET || '',
  webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN || 'my_secret_verify_token',
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  kafkaTopicRawEvents: process.env.KAFKA_TOPIC_RAW_EVENTS || 'raw_events'
};
