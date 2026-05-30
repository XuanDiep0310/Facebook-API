import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3002,
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  databaseUrl: process.env.DATABASE_URL || '',
  geminiApiKey: process.env.GEMINI_API_KEY || ''
};
