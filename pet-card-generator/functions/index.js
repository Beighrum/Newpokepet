const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const { generateCard } = require('./generate');
const { evolveCard } = require('./evolve');
const { createSanitizationStack } = require('./middleware/sanitization-middleware');
const { 
  initializeSentry, 
  wrapFunctionWithEnhancedSentry,
  configureSentryAlerts,
  reportServerSecurityMetrics,
  createServerDashboardEvent
} = require('./config/sentry-config');

// Initialize Sentry with enhanced monitoring
initializeSentry();
configureSentryAlerts();

// Initialize Express app
const app = express();

// Configure CORS middleware
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Configure JSON parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Add sanitization middleware stack for all routes
app.use(...createSanitizationStack({
    sanitization: { 
        contentType: 'defaultPolicy',
        bodyFields: ['petName', 'petType', 'description', 'customTags', 'displayName', 'bio'],
        queryFields: ['search', 'filter', 'name'],
        blockCritical: true
    },
    security: { 
        contentSecurityPolicy: "default-src 'self'; img-src 'self' data: https:; script-src 'self'" 
    },
    logging: { 
        logAllRequests: false,
        logViolationsOnly: true 
    }
}));

// Health check endpoint (no sanitization needed)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'pet-card-generator-functions',
        sanitization: 'enabled'
    });
});

// Card generation endpoint with enhanced Sentry monitoring
app.post('/generate', wrapFunctionWithEnhancedSentry('generateCard', async (req, res) => {
    try {
        console.log('Generate card request received');
        
        // Create dashboard event for card generation
        createServerDashboardEvent('card_generation_request', {
          timestamp: new Date().toISOString(),
          user_id: req.body?.userId || 'anonymous',
          content_length: JSON.stringify(req.body).length
        }, 'generateCard', { request_type: 'card_generation' });
        
        const result = await generateCard(req, res);
        return result;
    } catch (error) {
        console.error('Error in generate endpoint:', error);
        
        // Report error metrics
        createServerDashboardEvent('card_generation_error', {
          error_message: error.message,
          error_type: error.name,
          timestamp: new Date().toISOString()
        }, 'generateCard', { error_category: 'generation_failure' });
        
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to generate card',
            timestamp: new Date().toISOString()
        });
    }
}));

// Card evolution endpoint with enhanced Sentry monitoring
app.post('/evolve', wrapFunctionWithEnhancedSentry('evolveCard', async (req, res) => {
    try {
        console.log('Evolve card request received');
        
        // Create dashboard event for card evolution
        createServerDashboardEvent('card_evolution_request', {
          timestamp: new Date().toISOString(),
          user_id: req.body?.userId || 'anonymous',
          card_id: req.body?.cardId || 'unknown'
        }, 'evolveCard', { request_type: 'card_evolution' });
        
        const result = await evolveCard(req, res);
        return result;
    } catch (error) {
        console.error('Error in evolve endpoint:', error);
        
        // Report error metrics
        createServerDashboardEvent('card_evolution_error', {
          error_message: error.message,
          error_type: error.name,
          timestamp: new Date().toISOString()
        }, 'evolveCard', { error_category: 'evolution_failure' });
        
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to evolve card',
            timestamp: new Date().toISOString()
        });
    }
}));

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Endpoint ${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
    });
});

// Export the Express app as a Firebase Function with enhanced monitoring
exports.api = functions.https.onRequest(wrapFunctionWithEnhancedSentry('api', app));

// Export individual functions for direct access if needed
exports.generateCard = functions.https.onCall(async (data, context) => {
    try {
        // Validate authentication if required
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        console.log('Direct generateCard function called');
        
        // Sanitize data before processing
        const sanitizationService = require('./services/sanitization-service');
        const sanitizedData = await sanitizationService.sanitizePetCardMetadata({
            petName: data.petName,
            petType: data.petType,
            description: data.description,
            customTags: data.customTags
        }, {
            userId: context.auth.uid,
            ipAddress: context.rawRequest?.ip || 'unknown'
        });

        // Check for critical violations
        if (sanitizedData.sanitizedFields && sanitizedData.sanitizedFields.length > 0) {
            console.log(`Direct function sanitization applied to: ${sanitizedData.sanitizedFields.join(', ')}`);
        }

        const sanitizedRequestData = {
            ...data,
            petName: sanitizedData.petName,
            petType: sanitizedData.breed,
            description: sanitizedData.description,
            customTags: sanitizedData.customTags
        };

        return await generateCard({ body: sanitizedRequestData }, { json: (result) => result });
    } catch (error) {
        console.error('Error in direct generateCard function:', error);
        throw new functions.https.HttpsError('internal', 'Failed to generate card');
    }
});

exports.evolveCard = functions.https.onCall(async (data, context) => {
    try {
        // Validate authentication if required
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        console.log('Direct evolveCard function called');
        
        // Sanitize any user-provided data (cardId should be safe, but sanitize just in case)
        const sanitizationService = require('./services/sanitization-service');
        const sanitizedCardId = await sanitizationService.sanitizeHTMLAsync(data.cardId || '', {
            contentType: 'defaultPolicy',
            userId: context.auth.uid,
            ipAddress: context.rawRequest?.ip || 'unknown'
        });

        const sanitizedRequestData = {
            ...data,
            cardId: sanitizedCardId.sanitizedContent,
            userId: context.auth.uid // Ensure userId comes from auth context
        };

        return await evolveCard({ body: sanitizedRequestData }, { json: (result) => result });
    } catch (error) {
        console.error('Error in direct evolveCard function:', error);
        throw new functions.https.HttpsError('internal', 'Failed to evolve card');
    }
});
