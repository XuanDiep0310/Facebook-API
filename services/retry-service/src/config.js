import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3003,
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  maxRetry: Number(process.env.MAX_RETRY) || 5
};
