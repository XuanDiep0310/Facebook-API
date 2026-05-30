import db from './index.js';

export async function isCommandProcessed(commandId) {
  const result = await db.query(
    'SELECT status FROM idempotency_keys WHERE command_id = $1',
    [commandId]
  );
  return result.rows.length > 0;
}

export async function saveCommandProcessed(commandId, status) {
  await db.query(
    'INSERT INTO idempotency_keys (command_id, status) VALUES ($1, $2) ON CONFLICT (command_id) DO NOTHING',
    [commandId, status]
  );
}
