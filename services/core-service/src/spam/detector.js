import db from '../db/index.js';

export function containsLink(message) {
  if (!message) return false;
  // Regex phát hiện URL cơ bản
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  return urlRegex.test(message);
}

export async function checkRateLimit(senderId) {
  if (!senderId) return false;
  try {
    const result = await db.query(
      "SELECT COUNT(*) FROM comments WHERE sender_id = $1 AND created_at > NOW() - INTERVAL '1 minute'",
      [senderId]
    );
    const count = parseInt(result.rows[0].count, 10);
    return count >= 20; // 20 comments trong 1 phút
  } catch (err) {
    console.error('[Spam-Detector] Rate limit check error:', err.message);
    return false;
  }
}

export async function shouldBlacklist(senderId) {
  if (!senderId) return false;
  try {
    const result = await db.query(
      "SELECT COUNT(*) FROM comments WHERE sender_id = $1 AND intent = 'spam' AND created_at > NOW() - INTERVAL '24 hours'",
      [senderId]
    );
    const count = parseInt(result.rows[0].count, 10);
    return count >= 3; // Spam 3 lần trong 24 giờ -> blacklist
  } catch (err) {
    console.error('[Spam-Detector] Blacklist check error:', err.message);
    return false;
  }
}

// Bộ nhớ đệm lưu blacklist in-memory
const inMemoryBlacklist = new Set();

export async function isUserBlacklisted(senderId) {
  if (!senderId) return false;
  if (inMemoryBlacklist.has(senderId)) return true;
  
  const isSpammer = await shouldBlacklist(senderId);
  if (isSpammer) {
    inMemoryBlacklist.add(senderId);
    console.log(`[Spam-Detector] User ${senderId} has been auto-blacklisted.`);
    return true;
  }
  return false;
}
