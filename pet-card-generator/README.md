# Pet Card Generator

Transform your pet photos into collectible trading cards with AI-powered enhancements, rarity systems, and evolution mechanics.

## 🎯 Project Overview

The Pet Card Generator is a full-stack web application that combines modern React frontend with Firebase backend services to create an engaging pet photo transformation experience. Users can upload pet photos, generate unique trading cards with randomized stats and rarities, and evolve their cards through multiple stages.

### Key Features

- **AI-Powered Card Generation**: Transform pet photos into trading cards with enhanced backgrounds
- **Rarity System**: Cards are assigned rarities (Common, Uncommon, Rare, Epic, Legendary) with corresponding stat bonuses
- **Evolution Mechanics**: Cards can evolve through multiple stages with improved stats and visual effects
- **User Authentication**: Secure user accounts with Firebase Auth
- **Cloud Storage**: Reliable image storage and retrieval with Firebase Storage
- **Real-time Database**: Card data persistence with Firestore

## 🏗️ Project Structure

```
pet-card-generator/
├── functions/                 # Firebase Cloud Functions
│   ├── index.js              # Main function entry point with Express app
│   ├── generate.js           # Card generation endpoint
│   └── evolve.js             # Card evolution endpoint
├── src/                      # React frontend source code
│   ├── components/           # Reusable React components
│   │   ├── Navbar.jsx        # Navigation component with auth
│   │   └── ImageCard.jsx     # Card display component
│   └── pages/                # Page-level components
│       ├── UploadPage.jsx    # Photo upload and generation interface
│       └── EvolutionPage.jsx # Card evolution interface
├── docs/                     # Project documentation
│   ├── Complete-PRD.md       # Product Requirements Document
│   └── Stage10-Closure.md    # Project closure documentation
└── README.md                 # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** (version 18 or higher)
- **Firebase CLI** (`npm install -g firebase-tools`)
- **n8n Cloud account** for AI workflow orchestration

### Automated Setup

1. **Run the setup script**:
   ```bash
   cd pet-card-generator
   ./scripts/setup-dev.sh
   ```

2. **Configure environment**:
   ```bash
   # Copy and edit environment file
   cp .env.example .env.local
   # Update .env.local with your Firebase configuration
   ```

3. **Start development**:
   ```bash
   # Terminal 1: Start Firebase emulators
   npm run dev:emulators
   
   # Terminal 2: Start frontend development server
   npm run dev
   ```

### Manual Setup (Alternative)

1. **Install dependencies**:
   ```bash
   # Install frontend dependencies
   npm install
   
   # Install Firebase Functions dependencies
   cd functions && npm install && cd ..
   ```

2. **Configure Firebase**:
   ```bash
   firebase login
   firebase init  # if not already initialized
   ```

### Environment Variables

Create the following environment files with your specific configuration:

#### Firebase Functions Environment (`.env` in functions directory)

```bash
# n8n Workflow Configuration
N8N_WORKFLOW_URL=https://your-n8n-instance.com/webhook/your-workflow-id
N8N_API_KEY=your-n8n-api-key

# n8n Evolution Workflow (optional, falls back to main workflow)
N8N_EVOLUTION_WORKFLOW_URL=https://your-n8n-instance.com/webhook/evolution-workflow-id

# Sentry Error Tracking (optional)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Firebase Configuration (automatically provided by Firebase)
FIREBASE_CONFIG=auto
GCLOUD_PROJECT=your-firebase-project-id
```

#### Frontend Environment (`.env.local` in root directory)

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# API Endpoints
NEXT_PUBLIC_API_BASE_URL=https://your-region-your-project.cloudfunctions.net/api

# Sentry Error Tracking (optional)
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### Firebase Configuration

1. **Create a Firebase project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select existing one
   - Enable Authentication, Firestore, and Storage

2. **Configure Firebase services**:
   ```bash
   # Enable required services
   firebase projects:list
   firebase use your-project-id
   
   # Deploy Firestore security rules (create firestore.rules)
   firebase deploy --only firestore:rules
   
   # Deploy storage security rules (create storage.rules)
   firebase deploy --only storage
   ```

3. **Set up Authentication**:
   - Enable Email/Password authentication in Firebase Console
   - Configure authorized domains for your application

## 🔧 Development

### Running Locally

1. **Start Firebase Emulators** (recommended for development):
   ```bash
   firebase emulators:start
   ```

2. **Run Firebase Functions locally**:
   ```bash
   cd functions
   npm run serve
   ```

3. **Run React development server** (if using Create React App):
   ```bash
   npm start
   ```

### Testing

#### Firebase Functions Testing

```bash
cd functions
npm test

# Test specific endpoints
curl -X POST http://localhost:5001/your-project/us-central1/api/generate \
  -H "Content-Type: application/json" \
  -d '{"imageData":"base64-image-data","petName":"Fluffy","userId":"test-user"}'
```

#### Frontend Testing

```bash
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🚀 Deployment

### Firebase Functions Deployment

1. **Deploy all functions**:
   ```bash
   firebase deploy --only functions
   ```

2. **Deploy specific function**:
   ```bash
   firebase deploy --only functions:api
   ```

3. **Set environment variables**:
   ```bash
   firebase functions:config:set n8n.workflow_url="your-workflow-url"
   firebase functions:config:set n8n.api_key="your-api-key"
   ```

### Frontend Deployment

#### Option 1: Firebase Hosting

```bash
# Build the React app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

#### Option 2: Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel --prod
```

#### Option 3: Netlify Deployment

```bash
# Build the app
npm run build

# Deploy build folder to Netlify
# (Use Netlify dashboard or CLI)
```

## 🔌 API Endpoints

### Card Generation

**POST** `/api/generate`

Generate a new pet card from uploaded image.

```json
{
  "imageData": "base64-encoded-image-data",
  "petName": "Fluffy",
  "petType": "Cat",
  "userId": "user-id"
}
```

**Response:**
```json
{
  "success": true,
  "cardId": "generated-card-id",
  "card": {
    "petName": "Fluffy",
    "rarity": "Rare",
    "stats": {
      "cuteness": 85,
      "energy": 72,
      "loyalty": 90
    }
  }
}
```

### Card Evolution

**POST** `/api/evolve`

Evolve an existing card to the next stage.

```json
{
  "cardId": "existing-card-id",
  "userId": "user-id"
}
```

**Response:**
```json
{
  "success": true,
  "evolvedCard": {
    "id": "card-id",
    "evolution": {
      "stage": 2,
      "stageName": "Adult"
    },
    "stats": {
      "cuteness": 95,
      "energy": 88
    }
  }
}
```

## 🛠️ Configuration

### Firebase Security Rules

#### Firestore Rules (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cards collection - users can only access their own cards
    match /cards/{cardId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // Evolution logs - read-only for card owners
    match /evolutionLogs/{logId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

#### Storage Rules (`storage.rules`)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /pet-images/{imageId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.resource.size < 10 * 1024 * 1024;
    }
  }
}
```

### n8n Workflow Setup

The application integrates with n8n workflows for AI image processing. Set up your n8n workflow with the following endpoints:

1. **Image Generation Workflow**:
   - Receives: `imageUrl`, `petName`, `petType`
   - Returns: `processedImageUrl`, `enhancedBackground`

2. **Evolution Workflow** (optional):
   - Receives: `cardId`, `currentStage`, `targetStage`, `currentImageUrl`
   - Returns: `evolvedImageUrl`, `evolutionEffects`

## 📊 Monitoring and Analytics

### Error Tracking with Sentry

1. **Install Sentry**:
   ```bash
   npm install @sentry/react @sentry/node
   ```

2. **Configure Sentry** in your application initialization

3. **Monitor errors** in Sentry dashboard

### Firebase Analytics

Enable Firebase Analytics in your Firebase project to track:
- Card generation events
- Evolution success rates
- User engagement metrics
- Performance monitoring

## 🔍 Troubleshooting

### Common Issues

#### Firebase Functions Deployment Errors

```bash
# Check function logs
firebase functions:log

# Test functions locally
firebase emulators:start --only functions

# Verify environment variables
firebase functions:config:get
```

#### Image Upload Issues

- **File size limit**: Maximum 10MB per image
- **Supported formats**: JPEG, PNG, HEIC
- **CORS issues**: Ensure proper CORS configuration in Firebase Functions

#### n8n Integration Issues

- **Timeout errors**: Increase timeout values in function configuration
- **API key issues**: Verify n8n API key and workflow URL
- **Fallback handling**: Application provides fallback when n8n is unavailable

#### Authentication Issues

- **Unauthorized errors**: Check Firebase Auth configuration
- **CORS issues**: Verify authorized domains in Firebase Console
- **Token expiration**: Implement token refresh logic

### Performance Optimization

1. **Image Optimization**:
   - Compress images before upload
   - Use appropriate image formats
   - Implement lazy loading for card galleries

2. **Function Optimization**:
   - Use connection pooling for database connections
   - Implement caching for frequently accessed data
   - Optimize cold start times

3. **Frontend Optimization**:
   - Code splitting and lazy loading
   - Image optimization and caching
   - Bundle size optimization

## 📚 Additional Resources

### Documentation

- [Complete Product Requirements Document](./docs/Complete-PRD.md)
- [Project Closure Documentation](./docs/Stage10-Closure.md)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://reactjs.org/docs)

### Support

For issues and questions:

1. Check the troubleshooting section above
2. Review Firebase Console for error logs
3. Check n8n workflow status and logs
4. Monitor Sentry for application errors

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

---

**Happy card generating! 🎴✨**

*Transform your pet photos into magical trading cards and watch them evolve!*
