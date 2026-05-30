export function requireAdminAuth(req, res, next) {
  const apiKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_API_KEY || 'secret-key';
  
  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({
      error: {
        message: 'Unauthorized: Invalid or missing X-Admin-Key header',
        code: 'UNAUTHORIZED'
      }
    });
  }
  next();
}
