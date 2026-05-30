import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3000,
  accessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '',
  graphVersion: process.env.FACEBOOK_GRAPH_VERSION || 'v25.0',
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  databaseUrl: process.env.DATABASE_URL || '',
  adminApiKey: process.env.ADMIN_API_KEY || 'secret-key',
  maxRetry: Number(process.env.MAX_RETRY) || 5
};
