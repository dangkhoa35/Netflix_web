import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Nextflix API',
      version: '1.0.0',
      description: 'Backend API for Nextflix movie streaming platform',
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development server' },
    ],
    components: {
      schemas: {
        Movie: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            code: { type: 'string', example: 'MOV-0001' },
            title: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            studio: { type: 'string' },
            director: { type: 'string' },
            cast: { type: 'array', items: { type: 'string' } },
            categories: { type: 'array', items: { type: 'string' } },
            status: { type: 'string', enum: ['draft', 'published', 'hidden'] },
            ageRating: { type: 'string' },
            releaseDate: { type: 'string', format: 'date-time' },
            duration: { type: 'integer', description: 'Duration in minutes' },
            language: { type: 'array', items: { type: 'string' } },
            subtitles: { type: 'array', items: { type: 'string' } },
            imageUrl: { type: 'string', description: 'Single image URL for poster/backdrop/thumbnail' },
            trailerUrl: { type: 'string' },
            videoUrl: { type: 'string' },
            viewCount: { type: 'integer', description: 'Real view count aggregated from engagement events' },
            views: { type: 'integer', description: 'Backward compat alias of viewCount' },
            view_count: { type: 'integer', description: 'Backward compat alias of viewCount' },
            posterUrl: { type: 'string', description: 'Backward compat - populated from imageUrl' },
            backdropUrl: { type: 'string', description: 'Backward compat - populated from imageUrl' },
            thumbnailUrl: { type: 'string', description: 'Backward compat - populated from imageUrl' },
            tags: { type: 'array', items: { type: 'string' } },
            genre: { type: 'string', description: 'Backward compatible - categories joined' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Comment: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            content: { type: 'string' },
            movieId: { type: 'string' },
            userId: { type: 'string' },
            userName: { type: 'string' },
            userEmail: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        UserSummary: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', nullable: true },
            image: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            favoriteIds: { type: 'array', items: { type: 'string' } },
          },
        },
        MovieCreateInput: {
          type: 'object',
          required: ['title', 'description'],
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            studio: { type: 'string' },
            director: { type: 'string' },
            cast: { type: 'array', items: { type: 'string' } },
            categories: { type: 'array', items: { type: 'string' } },
            status: { type: 'string', enum: ['draft', 'published', 'hidden'] },
            ageRating: { type: 'string' },
            releaseDate: { type: 'string', format: 'date-time' },
            duration: { type: 'integer' },
            language: { type: 'array', items: { type: 'string' } },
            subtitles: { type: 'array', items: { type: 'string' } },
            imageUrl: { type: 'string', description: 'Single image URL for the movie' },
            trailerUrl: { type: 'string' },
            videoUrl: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
        PaginatedMovies: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { $ref: '#/components/schemas/Movie' } },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
