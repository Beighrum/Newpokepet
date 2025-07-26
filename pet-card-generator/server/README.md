# Pet Card Generator API

Backend API server for the Pet Card Generator application built with Express.js, TypeScript, and Firebase.

## Features

- **Authentication**: Firebase Auth integration with JWT token verification
- **File Upload**: Secure image upload with validation and processing
- **Image Processing**: Automatic image optimization and thumbnail generation
- **Database**: Firestore integration for data persistence
- **Security**: Comprehensive security middleware (CORS, Helmet, Rate limiting)
- **Validation**: Request validation with Joi schemas
- **Error Handling**: Centralized error handling with detailed error responses
- **Testing**: Comprehensive test suite with Vitest

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: Firebase Firestore
- **Storage**: Firebase Cloud Storage
- **Authentication**: Firebase Auth
- **Image Processing**: Sharp
- **File Upload**: Multer
- **Validation**: Joi
- **Testing**: Vitest + Supertest
- **Security**: Helmet, CORS, Rate limiting

## Getting Started

### Prerequisites

- Node.js 18+ 
- Firebase project with Firestore and Storage enabled
- Firebase service account key

### Installation

1. Clone the repository and navigate to the server directory:
```bash
cd pet-card-generator/server
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with Firebase credentials and other settings.

### Development

Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3001` by default.

### Building

Build the TypeScript code:
```bash
npm run build
```

### Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

### Linting

Check code style:
```bash
npm run lint
```

Fix linting issues:
```bash
npm run lint:fix
```

## API Endpoints

### Authentication
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/verify` - Verify authentication token

### File Upload
- `POST /api/upload` - Upload pet image
- `GET /api/upload/:uploadId` - Get upload details
- `DELETE /api/upload/:uploadId` - Delete upload
- `GET /api/upload/user/uploads` - Get user's uploads (paginated)

### Pet Cards
- `POST /api/pet-cards` - Create pet card
- `GET /api/pet-cards` - Get user's pet cards (paginated)
- `GET /api/pet-cards/:id` - Get specific pet card

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### System
- `GET /health` - Health check
- `GET /api` - API information

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Required |
| `FIREBASE_PRIVATE_KEY` | Firebase private key | Required |
| `FIREBASE_CLIENT_EMAIL` | Firebase client email | Required |
| `MAX_FILE_SIZE` | Maximum file size in bytes | `10485760` (10MB) |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:5173` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

## Security Features

- **Authentication**: Firebase JWT token verification
- **Authorization**: User-based access control
- **Input Validation**: Joi schema validation
- **File Validation**: MIME type and size validation
- **Rate Limiting**: Request rate limiting per IP
- **CORS**: Configurable cross-origin resource sharing
- **Security Headers**: Helmet.js security headers
- **Input Sanitization**: Automatic input sanitization

## Error Handling

The API uses standardized error responses:

```json
{
  "error": "ErrorCode",
  "message": "Human readable error message",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/endpoint",
  "method": "POST",
  "requestId": "unique-request-id"
}
```

Common error codes:
- `ValidationError` - Request validation failed
- `AuthenticationError` - Authentication required
- `AuthorizationError` - Insufficient permissions
- `NotFoundError` - Resource not found
- `RateLimitError` - Rate limit exceeded

## File Upload Process

1. **Validation**: File type, size, and dimensions are validated
2. **Processing**: Images are optimized and resized using Sharp
3. **Storage**: Files are uploaded to Firebase Cloud Storage
4. **Thumbnails**: Thumbnails are automatically generated
5. **Database**: Upload metadata is stored in Firestore

## Testing

The test suite includes:
- Unit tests for middleware functions
- Integration tests for API endpoints
- Authentication flow testing
- File upload testing
- Error handling testing

Run specific test files:
```bash
npm test -- auth.test.ts
npm test -- upload.test.ts
```

## Deployment

1. Build the application:
```bash
npm run build
```

2. Set production environment variables

3. Start the production server:
```bash
npm start
```

## Contributing

1. Follow TypeScript and ESLint conventions
2. Write tests for new features
3. Update documentation for API changes
4. Ensure all tests pass before submitting

## License

MIT License