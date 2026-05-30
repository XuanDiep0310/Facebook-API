import express from 'express';
import { config } from './config.js';
import { startKafkaConsumer } from './kafka/consumer.js';
import { connectProducer, disconnectProducer } from './kafka/producer.js';

const app = express();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'retry-service', port: config.port });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

async function main() {
  await connectProducer();
  await startKafkaConsumer();

  app.listen(config.port, () => {
    console.log(`🚀 [retry-service] Listening for health checks on port ${config.port}`);
  });

  const shutdown = async (signal) => {
    console.log(`\n[retry-service] ${signal} received — shutting down...`);
    await disconnectProducer();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[retry-service] Failed to start:', err);
});
