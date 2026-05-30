import { Kafka } from 'kafkajs';
import { config } from '../config.js';
import db from '../db/index.js';
import { processEvent } from '../automation/ruleEngine.js';

const kafka = new Kafka({
  clientId: 'core-service-consumer',
  brokers: config.kafkaBrokers
});

const consumer = kafka.consumer({ groupId: 'core-service-group' });

export async function startKafkaConsumer() {
  await consumer.connect();
  console.log('[kafka:core] Consumer connected.');

  await consumer.subscribe({ topic: 'raw_events', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const valueStr = message.value.toString();
      console.log(`[kafka:core] Received raw event: ${valueStr}`);
      
      try {
        const event = JSON.parse(valueStr);
        
        // Dedup bằng eventId (comment_id) trong DB
        const result = await db.query(
          "SELECT status FROM comments WHERE comment_id = $1",
          [event.eventId]
        );

        if (result.rows.length > 0) {
          const status = result.rows[0].status;
          const alreadyProcessed = ['processed', 'replied', 'hidden', 'ignored'].includes(status);
          if (alreadyProcessed) {
            console.log(`[kafka:core] Event ${event.eventId} already processed (status: ${status}). Skipping.`);
            return;
          }
        }

        // Xử lý sự kiện qua Rule Engine
        await processEvent(event);
      } catch (err) {
        console.error('[kafka:core] Error processing message:', err.message);
      }
    }
  });
}
