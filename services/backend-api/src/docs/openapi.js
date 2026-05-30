const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Facebook Page API + Webhook Service',
    version: '2.0.0',
    description:
      'Express proxy for Facebook Graph API (port 3000) and real-time Webhook Service (port 3001) that receives Facebook events, verifies signatures, normalizes payloads, and publishes to Kafka topic `raw_events`.',
  },
  servers: [
    { url: 'http://localhost:3000', description: 'API Service' },
    { url: 'http://localhost:3001', description: 'Webhook Service' },
  ],
  tags: [{ name: 'Page' }, { name: 'Post' }, { name: 'Webhook' }],
  paths: {
    '/api/page/{pageId}': {
      get: {
        tags: ['Page'],
        summary: 'Get Facebook Page information',
        parameters: [
          {
            name: 'pageId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'fields',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Graph API fields list',
          },
        ],
        responses: {
          200: { description: 'Page details' },
          400: { $ref: '#/components/responses/ErrorResponse' },
          401: { $ref: '#/components/responses/ErrorResponse' },
          403: { $ref: '#/components/responses/ErrorResponse' },
          502: { $ref: '#/components/responses/ErrorResponse' },
        },
      },
    },
    '/api/page/{pageId}/posts': {
      get: {
        tags: ['Page'],
        summary: 'Get Page posts/feed',
        parameters: [
          {
            name: 'pageId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'after', in: 'query', schema: { type: 'string' } },
          { name: 'before', in: 'query', schema: { type: 'string' } },
          { name: 'fields', in: 'query', schema: { type: 'string' } },
          { name: 'include_hidden', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: {
          200: { description: 'List of posts' },
          401: { $ref: '#/components/responses/ErrorResponse' },
          403: { $ref: '#/components/responses/ErrorResponse' },
          502: { $ref: '#/components/responses/ErrorResponse' },
        },
      },
      post: {
        tags: ['Page'],
        summary: 'Create a new post on Page feed',
        parameters: [
          {
            name: 'pageId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreatePostRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Post created' },
          400: { $ref: '#/components/responses/ErrorResponse' },
          401: { $ref: '#/components/responses/ErrorResponse' },
          403: { $ref: '#/components/responses/ErrorResponse' },
          502: { $ref: '#/components/responses/ErrorResponse' },
        },
      },
    },
    '/api/page/post/{postId}': {
      delete: {
        tags: ['Post'],
        summary: 'Delete an existing post',
        parameters: [
          {
            name: 'postId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: { description: 'Post deleted' },
          401: { $ref: '#/components/responses/ErrorResponse' },
          403: { $ref: '#/components/responses/ErrorResponse' },
          502: { $ref: '#/components/responses/ErrorResponse' },
        },
      },
    },
    '/api/page/post/{postId}/comments': {
      get: {
        tags: ['Post'],
        summary: 'Get comments for a post',
        parameters: [
          {
            name: 'postId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'after', in: 'query', schema: { type: 'string' } },
          { name: 'before', in: 'query', schema: { type: 'string' } },
          { name: 'fields', in: 'query', schema: { type: 'string' } },
          { name: 'filter', in: 'query', schema: { type: 'string' } },
          { name: 'order', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'List of comments' },
          401: { $ref: '#/components/responses/ErrorResponse' },
          403: { $ref: '#/components/responses/ErrorResponse' },
          502: { $ref: '#/components/responses/ErrorResponse' },
        },
      },
    },
    '/api/page/post/{postId}/likes': {
      get: {
        tags: ['Post'],
        summary: 'Get likes for a post (summary=true)',
        parameters: [
          {
            name: 'postId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: { description: 'Likes summary and/or data list' },
          401: { $ref: '#/components/responses/ErrorResponse' },
          403: { $ref: '#/components/responses/ErrorResponse' },
          502: { $ref: '#/components/responses/ErrorResponse' },
        },
      },
    },
    '/api/page/{pageId}/insights': {
      get: {
        tags: ['Page'],
        summary: 'Get Page insights (metric is required)',
        parameters: [
          {
            name: 'pageId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'metric',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'For multiple values use comma-separated format',
          },
          { name: 'period', in: 'query', schema: { type: 'string' } },
          { name: 'since', in: 'query', schema: { type: 'string' } },
          { name: 'until', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Insights result' },
          400: { $ref: '#/components/responses/ErrorResponse' },
          401: { $ref: '#/components/responses/ErrorResponse' },
          403: { $ref: '#/components/responses/ErrorResponse' },
          502: { $ref: '#/components/responses/ErrorResponse' },
        },
      },
    },

    // ─── Webhook Service (port 3001) ─────────────────────────────────────
    '/webhook': {
      get: {
        tags: ['Webhook'],
        summary: 'Facebook webhook verification handshake',
        description:
          'Facebook gửi GET request này khi đăng ký webhook. Service trả lại `hub.challenge` nếu `hub.verify_token` khớp với `WEBHOOK_VERIFY_TOKEN` trong `.env`.',
        servers: [{ url: 'http://localhost:3001', description: 'Webhook Service' }],
        parameters: [
          {
            name: 'hub.mode',
            in: 'query',
            required: true,
            schema: { type: 'string', enum: ['subscribe'] },
          },
          {
            name: 'hub.verify_token',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Token phải khớp với WEBHOOK_VERIFY_TOKEN trong .env',
          },
          {
            name: 'hub.challenge',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Chuỗi ngẫu nhiên do Facebook sinh ra, sẽ được trả lại',
          },
        ],
        responses: {
          200: { description: 'Trả lại hub.challenge — verification thành công' },
          403: { description: 'Verify token không khớp' },
        },
      },
      post: {
        tags: ['Webhook'],
        summary: 'Receive Facebook webhook event',
        description:
          'Facebook POST event này khi có bình luận, tin nhắn, reaction, ... Hệ thống xác thực chữ ký HMAC-SHA256 (`X-Hub-Signature-256`), normalize payload về schema chuẩn, rồi publish vào Kafka topic `raw_events`.',
        servers: [{ url: 'http://localhost:3001', description: 'Webhook Service' }],
        parameters: [
          {
            name: 'X-Hub-Signature-256',
            in: 'header',
            required: true,
            schema: { type: 'string', example: 'sha256=abc123...' },
            description: 'HMAC-SHA256 signature: sha256=<hex>. Ký bằng App Secret.',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FacebookWebhookPayload' },
            },
          },
        },
        responses: {
          200: { description: 'EVENT_RECEIVED — đã nhận, đang xử lý async' },
          403: { description: 'Chữ ký không hợp lệ' },
          500: { description: 'Internal Server Error' },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Webhook'],
        summary: 'Health check của webhook service',
        servers: [{ url: 'http://localhost:3001', description: 'Webhook Service' }],
        responses: {
          200: {
            description: 'Service đang chạy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    service: { type: 'string', example: 'webhook-service' },
                    port: { type: 'integer', example: 3001 },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      CreatePostRequest: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          link: { type: 'string', format: 'uri' },
          published: { type: 'boolean' },
        },
        description: 'At least one of message or link should be provided.',
      },
      ErrorBody: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
      // Schema chuẩn sau khi normalize
      NormalizedEvent: {
        type: 'object',
        description: 'Schema chuẩn của mọi event sau khi normalize, được publish vào Kafka topic raw_events',
        properties: {
          eventId:        { type: 'string', description: 'ID duy nhất của event' },
          eventType:      { type: 'string', enum: ['comment', 'message', 'message_echo', 'postback', 'message_read', 'message_delivery', 'reaction', 'post', 'unknown'] },
          verb:           { type: 'string', description: 'Hành động: created | edited | deleted | received ...' },
          source:         { type: 'string', enum: ['facebook'] },
          pageId:         { type: 'string' },
          senderId:       { type: 'string' },
          senderName:     { type: 'string', nullable: true },
          recipientId:    { type: 'string' },
          postId:         { type: 'string', nullable: true },
          parentCommentId:{ type: 'string', nullable: true, description: 'ID comment cha nếu là reply' },
          content:        { type: 'string', description: 'Nội dung text chính' },
          timestamp:      { type: 'integer', description: 'Unix milliseconds' },
          rawPayload:     { type: 'object', description: 'Payload gốc từ Facebook' },
        },
      },
      FacebookWebhookPayload: {
        type: 'object',
        description: 'Payload gốc do Facebook gửi đến webhook',
        properties: {
          object: { type: 'string', example: 'page' },
          entry:  {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id:       { type: 'string', description: 'Page ID' },
                time:     { type: 'integer' },
                changes:  { type: 'array', items: { type: 'object' }, description: 'Feed changes (comment, post, reaction)' },
                messaging:{ type: 'array', items: { type: 'object' }, description: 'Messenger events' },
              },
            },
          },
        },
      },
    },
    responses: {
      ErrorResponse: {
        description: 'Error response',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorBody' },
          },
        },
      },
    },
  },
};

export default openApiSpec;
