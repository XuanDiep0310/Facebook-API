import express from 'express';
import swaggerUi from 'swagger-ui-express';
import morgan from 'morgan';
import { config } from './config.js';
import openApiSpec from './docs/openapi.js';
import pageRouter from './routes/pageApi.js';
import adminRouter from './routes/adminApi.js';
import logger from './middleware/logger.js';
import { startKafkaConsumer } from './kafka/consumer.js';

const app = express();

app.use(express.json());

// Tích hợp Morgan với Winston Logger
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

app.get('/openapi.json', (req, res) => res.json(openApiSpec));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.use('/api/page', pageRouter);
app.use('/api/admin', adminRouter);

app.use((err, req, res, next) => {
  if (err.graphError) {
    logger.error(`Error passed to express handler: ${JSON.stringify(err.graphError)}`);
    return res.status(err.status || 502).json({ error: err.graphError });
  }
  logger.error(`Unhandled error in express: ${err.stack}`);
  res.status(500).json({
    error: { message: err.message || 'Internal Server Error' },
  });
});

app.listen(config.port, () => {
  logger.info(`[backend-api] Listening on http://localhost:${config.port}`);
  logger.info(`[backend-api] Swagger docs: http://localhost:${config.port}/docs`);
});

// Khởi chạy Kafka Consumer song song
startKafkaConsumer().catch((err) => {
  logger.error(`[backend-api] Failed to start Kafka Consumer: ${err.message}`);
});
