const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const sanitizationService = require('./services/sanitization-service');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const storage = new Storage();
const bucket = storage.bucket();
const db = admin.firestore();

// Configuration constants
const N8N_WORKFLOW_URL = process.env.N8N_WORKFLOW_URL || '<workflow_endpoint>';
const N8N_API_KEY = process.env.N8N_API_KEY || '<api_key>';
const UPLOAD_TIMEOUT = 30000; // 30 seconds
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Rarity levels and their probabilities
const RARITY_LEVELS = [
    { name: 'Common', probability: 0.5, multiplier: 1.0 },
    { name: 'Uncommon', probability: 0.3, multiplier: 1.2 },
    { name: 'Rare', probability: 0.15, multiplier: 1.5 },
    { name: 'Epic', probability: 0.04, multiplier: 2.0 },
    { name: 'Legendary', probability: 0.01, multiplier: 3.0 }
];

// Generate random stats based on rarity
function generateStats(rarity) {
    const baseStats = {
        cuteness: Math.floor(Math.random() * 50) + 50,
        energy: Math.floor(Math.random() * 50) + 50,
        loyalty: Math.floor(Math.random() * 50) + 50,
        intelligence: Math.floor(Math.random() * 50) + 50,
        playfulness: Math.floor(Math.random() * 50) + 50
    };

    const multiplier = rarity.multiplier;
    return Object.keys(baseStats).reduce((stats, key) => {
        stats[key] = Math.min(100, Math.floor(baseStats[key] * multiplier));
        return stats;
    }, {});
}

// Determine rarity based on probability
function determineRarity() {
    const random = Math.random();
    let cumulativeProbability = 0;

    for (const rarity of RARITY_LEVELS) {
        cumulativeProbability += rarity.probability;
        if (random <= cumulativeProbability) {
            return rarity;
        }
    }

    // Fallback to common if something goes wrong
    return RARITY_LEVELS[0];
}

// Upload image to Firebase Storage
async function uploadImageToStorage(imageBuffer, filename, contentType) {
    try {
        const file = bucket.file(`pet-images/${filename}`);
        
        await file.save(imageBuffer, {
            metadata: {
                contentType: contentType,
                metadata: {
                    uploadedAt: new Date().toISOString(),
                    source: 'pet-card-generator'
                }
            }
        });

        // Generate signed URL for access
        const [signedUrl] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        });

        return {
            filename,
            url: signedUrl,
            gsUrl: `gs://${bucket.name}/pet-images/${filename}`
        };
    } catch (error) {
        console.error('Error uploading image to storage:', error);
        throw new Error('Failed to upload image to storage');
    }
}

// Process image with n8n workflow
async function processImageWithN8N(imageUrl, petName, petType) {
    try {
        const response = await axios.post(N8N_WORKFLOW_URL, {
            imageUrl: imageUrl,
            petName: petName || 'Unknown Pet',
            petType: petType || 'Pet',
            timestamp: new Date().toISOString()
        }, {
            headers: {
                'Authorization': `Bearer ${N8N_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: UPLOAD_TIMEOUT
        });

        if (response.status !== 200) {
            throw new Error(`n8n workflow returned status ${response.status}`);
        }

        return response.data;
    } catch (error) {
        console.error('Error processing image with n8n:', error);
        
        // Return fallback data if n8n fails
        return {
            processedImageUrl: imageUrl, // Use original image as fallback
            enhancedBackground: false,
            processingStatus: 'fallback'
        };
    }
}

// Save card data to Firestore
async function saveCardToFirestore(cardData, userId) {
    try {
        const cardRef = db.collection('cards').doc();
        const cardWithMetadata = {
            ...cardData,
            id: cardRef.id,
            userId: userId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            version: 1
        };

        await cardRef.set(cardWithMetadata);
        return cardRef.id;
    } catch (error) {
        console.error('Error saving card to Firestore:', error);
        throw new Error('Failed to save card data');
    }
}

// Main generate card function
async function generateCard(req, res) {
    try {
        console.log('Starting card generation process');

        // Validate request body
        const { imageData, petName, petType, userId } = req.body;

        if (!imageData) {
            return res.status(400).json({
                error: 'Bad request',
                message: 'Image data is required'
            });
        }

        if (!userId) {
            return res.status(400).json({
                error: 'Bad request',
                message: 'User ID is required'
            });
        }

        // Sanitize file upload metadata before processing
        console.log('Sanitizing file upload metadata');
        const fileMetadata = {
            originalName: req.body.originalName || 'uploaded-image',
            mimeType: req.body.mimeType || 'image/jpeg',
            uploadSource: req.body.uploadSource || 'web',
            userAgent: req.get('User-Agent') || 'unknown'
        };

        const sanitizedFileMetadata = {};
        for (const [key, value] of Object.entries(fileMetadata)) {
            if (typeof value === 'string') {
                const result = await sanitizationService.sanitizeHTMLAsync(value, {
                    contentType: 'defaultPolicy',
                    userId: userId,
                    ipAddress: req.ip || req.connection.remoteAddress
                });
                sanitizedFileMetadata[key] = result.sanitizedContent;
                
                // Log if sanitization was applied
                if (result.securityViolations.length > 0) {
                    console.log(`File metadata sanitization applied to ${key}: ${result.securityViolations.length} violations`);
                }
            } else {
                sanitizedFileMetadata[key] = value;
            }
        }

        // Process base64 image data
        let imageBuffer;
        let contentType = 'image/jpeg';

        try {
            // Handle base64 data URL format
            if (imageData.startsWith('data:')) {
                const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
                if (!matches) {
                    throw new Error('Invalid base64 data URL format');
                }
                contentType = matches[1];
                imageBuffer = Buffer.from(matches[2], 'base64');
            } else {
                // Assume raw base64
                imageBuffer = Buffer.from(imageData, 'base64');
            }

            // Validate file size
            if (imageBuffer.length > MAX_FILE_SIZE) {
                return res.status(400).json({
                    error: 'Bad request',
                    message: 'Image file too large (max 10MB)'
                });
            }
        } catch (error) {
            console.error('Error processing image data:', error);
            return res.status(400).json({
                error: 'Bad request',
                message: 'Invalid image data format'
            });
        }

        // Generate unique filename
        const filename = `${uuidv4()}.${contentType.split('/')[1]}`;

        // Upload image to Firebase Storage
        console.log('Uploading image to Firebase Storage');
        const uploadResult = await uploadImageToStorage(imageBuffer, filename, contentType);

        // Determine card rarity and generate stats
        const rarity = determineRarity();
        const stats = generateStats(rarity);

        console.log(`Generated ${rarity.name} rarity card with stats:`, stats);

        // Sanitize pet card metadata before processing
        console.log('Sanitizing pet card metadata');
        const sanitizedMetadata = await sanitizationService.sanitizePetCardMetadata({
            petName: petName || 'Unknown Pet',
            petType: petType || 'Pet',
            description: req.body.description,
            customTags: req.body.customTags
        }, {
            userId: userId,
            ipAddress: req.ip || req.connection.remoteAddress
        });

        // Check if sanitization found critical violations
        if (sanitizedMetadata.sanitizedFields && sanitizedMetadata.sanitizedFields.length > 0) {
            console.log(`Sanitization applied to fields: ${sanitizedMetadata.sanitizedFields.join(', ')}`);
        }

        // Process image with n8n workflow using sanitized data
        console.log('Processing image with n8n workflow');
        const n8nResult = await processImageWithN8N(
            uploadResult.url, 
            sanitizedMetadata.petName, 
            sanitizedMetadata.breed
        );

        // Create card data object with sanitized content
        const cardData = {
            petName: sanitizedMetadata.petName,
            petType: sanitizedMetadata.breed,
            rarity: rarity.name,
            stats: stats,
            images: {
                original: uploadResult.url,
                processed: n8nResult.processedImageUrl || uploadResult.url
            },
            metadata: {
                filename: uploadResult.filename,
                contentType: contentType,
                fileSize: imageBuffer.length,
                processingStatus: n8nResult.processingStatus || 'completed',
                enhancedBackground: n8nResult.enhancedBackground || false,
                // Include sanitized metadata
                petName: sanitizedMetadata.petName,
                breed: sanitizedMetadata.breed,
                description: sanitizedMetadata.description,
                customTags: sanitizedMetadata.customTags || [],
                sanitizedFields: sanitizedMetadata.sanitizedFields || [],
                // Include sanitized file metadata
                upload: {
                    originalName: sanitizedFileMetadata.originalName,
                    mimeType: sanitizedFileMetadata.mimeType,
                    uploadSource: sanitizedFileMetadata.uploadSource,
                    userAgent: sanitizedFileMetadata.userAgent,
                    uploadedAt: new Date().toISOString(),
                    ipAddress: req.ip || req.connection.remoteAddress
                }
            },
            evolution: {
                stage: 1,
                maxStage: 3,
                canEvolve: true,
                evolutionRequirements: {
                    minLevel: 10,
                    requiredStats: {
                        cuteness: 70,
                        energy: 60
                    }
                }
            },
            // Add sanitization info
            sanitizationInfo: {
                lastSanitized: new Date().toISOString(),
                violationsFound: (sanitizedMetadata.sanitizedFields || []).length,
                sanitizationVersion: '1.0.0',
                isValid: true
            }
        };

        // Validate sanitized data before Firestore write
        console.log('Validating sanitized data before Firestore write');
        const validationResult = await sanitizationService.validateContentAsync(
            JSON.stringify(cardData), 
            { 
                contentType: 'petCardMetadata',
                userId: userId 
            }
        );

        if (!validationResult.isValid && validationResult.riskLevel === 'critical') {
            console.error('Critical security violation detected in card data:', validationResult.violations);
            return res.status(400).json({
                error: 'Content blocked',
                message: 'Card data contains dangerous elements and has been blocked.',
                violations: validationResult.violations.length,
                code: 'CARD_DATA_BLOCKED'
            });
        }

        if (validationResult.violations.length > 0) {
            console.warn(`Card data validation found ${validationResult.violations.length} violations (risk level: ${validationResult.riskLevel})`);
        }

        // Save sanitized card to Firestore
        console.log('Saving sanitized card to Firestore');
        const cardId = await saveCardToFirestore(cardData, userId);

        // Return success response
        const response = {
            success: true,
            cardId: cardId,
            card: {
                ...cardData,
                id: cardId
            },
            message: 'Card generated successfully',
            timestamp: new Date().toISOString()
        };

        console.log('Card generation completed successfully');
        return res.status(200).json(response);

    } catch (error) {
        console.error('Error in generateCard function:', error);
        
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to generate card',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = { generateCard };
