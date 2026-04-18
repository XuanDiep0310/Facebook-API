const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Facebook Page API',
    version: '1.0.0',
    description: 'Express proxy for Facebook Graph API endpoints for a Facebook Page.',
  },
  servers: [{ url: 'http://localhost:3000' }],
  tags: [{ name: 'Page' }, { name: 'Post' }],
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
