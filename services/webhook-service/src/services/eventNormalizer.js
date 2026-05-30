import { randomUUID } from 'crypto';

function extractPostId(value) {
  if (!value) return null;
  return String(value);
}

function normalizeFeedChange(pageId, change, rawEntry) {
  const v = change.value || {};
  const item = v.item || 'unknown'; // 'comment', 'post', 'reaction', 'like', ...
  const verbMap = {
    add: 'created',
    edited: 'edited',
    remove: 'deleted',
    hide: 'hidden',
    unhide: 'unhidden',
  };

  let eventType;
  if (item === 'comment') eventType = 'comment';
  else if (item === 'post') eventType = 'post';
  else if (item === 'reaction') eventType = 'reaction';
  else eventType = item || 'unknown';

  const eventId = v.comment_id || v.post_id || v.reaction_id || randomUUID();

  return {
    eventId: String(eventId),
    eventType,
    verb: verbMap[v.verb] || v.verb || 'unknown',
    source: 'facebook',
    pageId: String(pageId),
    senderId: String(v.from?.id || v.sender_id || ''),
    senderName: v.from?.name || null,
    recipientId: String(pageId),
    postId: extractPostId(v.post_id),
    parentCommentId: v.parent_id ? String(v.parent_id) : null,
    content: v.message || v.story || '',
    timestamp: v.created_time ? v.created_time * 1000 : Date.now(),
    rawPayload: rawEntry,
  };
}

function normalizeMessaging(pageId, messaging) {
  const { sender, recipient, timestamp, message, postback, read, delivery } = messaging;

  let eventType = 'message';
  let content = '';
  let eventId;

  if (message) {
    eventType = message.is_echo ? 'message_echo' : 'message';
    content = message.text || '';
    eventId = message.mid || randomUUID();
  } else if (postback) {
    eventType = 'postback';
    content = postback.title || postback.payload || '';
    eventId = randomUUID();
  } else if (read) {
    eventType = 'message_read';
    eventId = randomUUID();
  } else if (delivery) {
    eventType = 'message_delivery';
    eventId = randomUUID();
  } else {
    eventId = randomUUID();
  }

  return {
    eventId: String(eventId),
    eventType,
    verb: 'received',
    source: 'facebook',
    pageId: String(pageId),
    senderId: String(sender?.id || ''),
    senderName: null,
    recipientId: String(recipient?.id || pageId),
    postId: null,
    parentCommentId: null,
    content,
    timestamp: timestamp || Date.now(),
    rawPayload: messaging,
  };
}

export function normalizeWebhookPayload(body) {
  const events = [];

  if (!body || !Array.isArray(body.entry)) {
    return events;
  }

  for (const entry of body.entry) {
    const pageId = entry.id;

    if (Array.isArray(entry.changes)) {
      for (const change of entry.changes) {
        if (change.field === 'feed') {
          try {
            events.push(normalizeFeedChange(pageId, change, entry));
          } catch (err) {
            console.error('[normalizer] Failed to normalize feed change:', err.message);
          }
        }
      }
    }

    if (Array.isArray(entry.messaging)) {
      for (const messaging of entry.messaging) {
        try {
          events.push(normalizeMessaging(pageId, messaging));
        } catch (err) {
          console.error('[normalizer] Failed to normalize messaging event:', err.message);
        }
      }
    }
  }

  return events;
}
