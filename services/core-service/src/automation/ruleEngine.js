import { randomUUID } from 'crypto';
import db from '../db/index.js';
import { analyzeComment } from '../ai/analyzer.js';
import { containsLink, checkRateLimit, isUserBlacklisted } from '../spam/detector.js';
import { publishReplyCommand } from '../kafka/producer.js';

export async function processEvent(event) {
  const { eventId, eventType, pageId, senderId, senderName, postId, content } = event;

  if (eventType !== 'comment') {
    // Chỉ xử lý comment
    return;
  }

  const commentId = eventId;

  console.log(`[Rule-Engine] Processing comment ${commentId}: "${content}"`);

  // 1. Lưu comment ban đầu vào DB
  try {
    await db.query(
      `INSERT INTO comments (comment_id, post_id, message, sender_id, status) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (comment_id) DO NOTHING`,
      [commentId, postId, content, senderId, 'received']
    );
  } catch (err) {
    console.error('[Rule-Engine] Failed to save initial comment:', err.message);
  }

  // 2. Kiểm tra blacklist
  const blacklisted = await isUserBlacklisted(senderId);
  if (blacklisted) {
    console.log(`[Rule-Engine] Sender ${senderId} is blacklisted. Ignoring.`);
    await db.query("UPDATE comments SET status = 'ignored' WHERE comment_id = $1", [commentId]);
    return;
  }

  // 3. Kiểm tra rate limit (20 comments/min)
  const rateLimited = await checkRateLimit(senderId);
  if (rateLimited) {
    console.log(`[Rule-Engine] Sender ${senderId} rate limited. Marking as pending_review.`);
    await db.query("UPDATE comments SET status = 'pending_review' WHERE comment_id = $1", [commentId]);
    return;
  }

  // 4. Kiểm tra link độc hại/scam
  if (containsLink(content)) {
    console.log(`[Rule-Engine] Comment contains link. Auto-hiding and setting pending_review.`);
    await db.query(
      "UPDATE comments SET intent = 'spam', status = 'pending_review' WHERE comment_id = $1", 
      [commentId]
    );
    const commandId = randomUUID();
    await publishReplyCommand(commandId, commentId, pageId, 'hide');
    return;
  }

  // 5. Gọi AI để phân tích sentiment và intent
  try {
    const aiResult = await analyzeComment(content);
    const { intent, sentiment, isSpam } = aiResult;

    console.log(`[Rule-Engine] AI Result for comment ${commentId}: Intent=${intent}, Sentiment=${sentiment}, isSpam=${isSpam}`);

    // Cập nhật DB
    await db.query(
      `UPDATE comments 
       SET intent = $1, sentiment = $2, status = 'processed' 
       WHERE comment_id = $3`,
      [intent, sentiment, commentId]
    );

    const commandId = randomUUID();

    // 6. Áp dụng luật tự động hóa phản hồi
    if (isSpam || intent === 'spam') {
      console.log(`[Rule-Engine] Detected spam by AI. Auto-hiding comment ${commentId}`);
      await publishReplyCommand(commandId, commentId, pageId, 'hide');
      await db.query("UPDATE comments SET status = 'hidden' WHERE comment_id = $1", [commentId]);
    } 
    else if (sentiment === 'positive') {
      const replyMsg = `Cảm ơn bạn${senderName ? ' ' + senderName : ''} đã để lại phản hồi tích cực! Shop chúc bạn một ngày vui vẻ.`;
      console.log(`[Rule-Engine] Positive sentiment. Replying to comment ${commentId}`);
      await publishReplyCommand(commandId, commentId, pageId, 'reply', replyMsg);
    } 
    else if (sentiment === 'negative') {
      const replyMsg = `Dạ chào bạn, rất xin lỗi vì trải nghiệm chưa hài lòng. Shop sẽ nhắn tin hỗ trợ bạn ngay lập tức ạ!`;
      console.log(`[Rule-Engine] Negative sentiment. Replying to comment ${commentId}`);
      await publishReplyCommand(commandId, commentId, pageId, 'reply', replyMsg);
    } 
    else if (intent === 'ask_price') {
      const replyMsg = `Dạ chào bạn, bạn vui lòng check inbox tin nhắn, shop đã gửi thông tin chi tiết qua hộp thư rồi ạ!`;
      console.log(`[Rule-Engine] Price inquiry. Replying to comment ${commentId}`);
      await publishReplyCommand(commandId, commentId, pageId, 'reply', replyMsg);
    } 
    else {
      console.log(`[Rule-Engine] Neutral/other comment. No auto reply needed for ${commentId}`);
    }

  } catch (aiErr) {
    console.error(`[Rule-Engine] AI Analysis error for ${commentId}:`, aiErr.message);
  }
}
