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
const N8N_EVOLUTION_WORKFLOW_URL = process.env.N8N_EVOLUTION_WORKFLOW_URL || process.env.N8N_WORKFLOW_URL || '<evolution_workflow_endpoint>';
const N8N_API_KEY = process.env.N8N_API_KEY || '<api_key>';
const EVOLUTION_TIMEOUT = 45000; // 45 seconds for evolution processing

// Evolution stage configurations
const EVOLUTION_STAGES = {
    1: {
        name: 'Baby',
        statMultiplier: 1.0,
        nextStage: 2,
        requirements: {
            minLevel: 10,
            requiredStats: { cuteness: 70, energy: 60 }
        }
    },
    2: {
        name: 'Adult',
        statMultiplier: 1.5,
        nextStage: 3,
        requirements: {
            minLevel: 25,
            requiredStats: { cuteness: 85, energy: 80, loyalty: 75 }
        }
    },
    3: {
        name: 'Elder',
        statMultiplier: 2.0,
        nextStage: null,
        requirements: null
    }
};

// Validate evolution requirements
function canEvolve(cardData) {
    const currentStage = cardData.evolution?.stage || 1;
    const maxStage = cardData.evolution?.maxStage || 3;

    // Check if already at max stage
    if (currentStage >= maxStage) {
        return {
            canEvolve: false,
            reason: 'Card is already at maximum evolution stage'
        };
    }

    const stageConfig = EVOLUTION_STAGES[currentStage];
    if (!stageConfig || !stageConfig.requirements) {
        return {
            canEvolve: false,
            reason: 'Invalid evolution stage configuration'
        };
    }

    const requirements = stageConfig.requirements;
    const cardStats = cardData.stats || {};

    // Check level requirement (if implemented)
    const currentLevel = cardData.level || 1;
    if (currentLevel < requirements.minLevel) {
        return {
            canEvolve: false,
            reason: `Card level ${currentLevel} is below required level ${requirements.minLevel}`
        };
    }

    // Check stat requirements
    for (const [statName, requiredValue] of Object.entries(requirements.requiredStats)) {
        const currentValue = cardStats[statName] || 0;
        if (currentValue < requiredValue) {
            return {
                canEvolve: false,
                reason: `${statName} stat ${currentValue} is below required ${requiredValue}`
            };
        }
    }

    return {
        canEvolve: true,
        nextStage: stageConfig.nextStage
    };
}

// Calculate evolved stats
function calculateEvolvedStats(currentStats, fromStage, toStage) {
    const fromMultiplier = EVOLUTION_STAGES[fromStage]?.statMultiplier || 1.0;
    const toMultiplier = EVOLUTION_STAGES[toStage]?.statMultiplier || 1.5;
    
    const evolutionBonus = toMultiplier / fromMultiplier;
    const evolvedStats = {};

    for (const [statName, currentValue] of Object.entries(currentStats)) {
        // Apply evolution bonus with some randomness
        const bonus = Math.floor(currentValue * (evolutionBonus - 1)) + Math.floor(Math.random() * 10);
        evolvedStats[statName] = Math.min(100, currentValue + bonus);
    }

    return evolvedStats;
}

// Process evolution with n8n workflow
async function processEvolutionWithN8N(cardData, targetStage) {
    try {
        const evolutionRequest = {
            cardId: cardData.id,
            currentStage: cardData.evolution?.stage || 1,
            targetStage: targetStage,
            petName: cardData.petName,
            petType: cardData.petType,
            currentImageUrl: cardData.images?.processed || cardData.images?.original,
            stats: cardData.stats,
            timestamp: new Date().toISOString()
        };

        console.log('Sending evolution request to n8n:', evolutionRequest);

        const response = await axios.post(N8N_EVOLUTION_WORKFLOW_URL, evolutionRequest, {
            headers: {
                'Authorization': `Bearer ${N8N_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: EVOLUTION_TIMEOUT
        });

        if (response.status !== 200) {
            throw new Error(`n8n evolution workflow returned status ${response.status}`);
        }

        return response.data;
    } catch (error) {
        console.error('Error processing evolution with n8n:', error);
        
        // Return fallback data if n8n fails
        return {
            evolvedImageUrl: cardData.images?.processed || cardData.images?.original,
            evolutionEffects: [],
            processingStatus: 'fallback',
            message: 'Evolution completed with basic processing'
        };
    }
}

// Retrieve card data from Firestore
async function getCardFromFirestore(cardId, userId) {
    try {
        const cardRef = db.collection('cards').doc(cardId);
        const cardDoc = await cardRef.get();

        if (!cardDoc.exists) {
            throw new Error('Card not found');
        }

        const cardData = cardDoc.data();

        // Verify ownership
        if (cardData.userId !== userId) {
            throw new Error('Unauthorized: Card does not belong to user');
        }

        return cardData;
    } catch (error) {
        console.error('Error retrieving card from Firestore:', error);
        throw error;
    }
}

// Update card data in Firestore
async function updateCardInFirestore(cardId, updatedData) {
    try {
        const cardRef = db.collection('cards').doc(cardId);
        
        const updateData = {
            ...updatedData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            version: admin.firestore.FieldValue.increment(1)
        };

        await cardRef.update(updateData);
        
        // Return updated card data
        const updatedDoc = await cardRef.get();
        return updatedDoc.data();
    } catch (error) {
        console.error('Error updating card in Firestore:', error);
        throw new Error('Failed to update card data');
    }
}

// Log evolution event
async function logEvolutionEvent(cardId, userId, fromStage, toStage, success, error = null) {
    try {
        const evolutionLogRef = db.collection('evolutionLogs').doc();
        
        await evolutionLogRef.set({
            cardId: cardId,
            userId: userId,
            fromStage: fromStage,
            toStage: toStage,
            success: success,
            error: error,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (logError) {
        console.error('Error logging evolution event:', logError);
        // Don't throw here as this is just logging
    }
}

// Main evolve card function
async function evolveCard(req, res) {
    let cardId, userId, currentStage;
    
    try {
        console.log('Starting card evolution process');

        // Validate request body
        const { cardId: requestCardId, userId: requestUserId } = req.body;

        if (!requestCardId) {
            return res.status(400).json({
                error: 'Bad request',
                message: 'Card ID is required'
            });
        }

        if (!requestUserId) {
            return res.status(400).json({
                error: 'Bad request',
                message: 'User ID is required'
            });
        }

        cardId = requestCardId;
        userId = requestUserId;

        // Retrieve card data from Firestore
        console.log('Retrieving card data from Firestore');
        const cardData = await getCardFromFirestore(cardId, userId);
        currentStage = cardData.evolution?.stage || 1;

        // Validate evolution requirements
        console.log('Validating evolution requirements');
        const evolutionCheck = canEvolve(cardData);

        if (!evolutionCheck.canEvolve) {
            await logEvolutionEvent(cardId, userId, currentStage, null, false, evolutionCheck.reason);
            
            return res.status(400).json({
                error: 'Evolution not allowed',
                message: evolutionCheck.reason,
                currentStage: currentStage,
                requirements: EVOLUTION_STAGES[currentStage]?.requirements
            });
        }

        const targetStage = evolutionCheck.nextStage;
        console.log(`Evolving card from stage ${currentStage} to stage ${targetStage}`);

        // Process evolution with n8n workflow
        console.log('Processing evolution with n8n workflow');
        const evolutionResult = await processEvolutionWithN8N(cardData, targetStage);

        // Calculate evolved stats
        const evolvedStats = calculateEvolvedStats(cardData.stats, currentStage, targetStage);

        // Prepare updated card data
        const updatedCardData = {
            stats: evolvedStats,
            evolution: {
                ...cardData.evolution,
                stage: targetStage,
                canEvolve: targetStage < (cardData.evolution?.maxStage || 3),
                evolutionHistory: [
                    ...(cardData.evolution?.evolutionHistory || []),
                    {
                        fromStage: currentStage,
                        toStage: targetStage,
                        timestamp: new Date().toISOString(),
                        statsGained: Object.keys(evolvedStats).reduce((gains, statName) => {
                            gains[statName] = evolvedStats[statName] - (cardData.stats[statName] || 0);
                            return gains;
                        }, {})
                    }
                ]
            },
            images: {
                ...cardData.images,
                evolved: evolutionResult.evolvedImageUrl || cardData.images?.processed
            },
            metadata: {
                ...cardData.metadata,
                lastEvolution: new Date().toISOString(),
                evolutionProcessingStatus: evolutionResult.processingStatus || 'completed'
            },
            // Update sanitization info
            sanitizationInfo: {
                ...cardData.sanitizationInfo,
                lastSanitized: new Date().toISOString(),
                evolutionSanitized: true
            }
        };

        // Validate sanitized data before Firestore write
        console.log('Validating evolution data before Firestore write');
        const validationResult = await sanitizationService.validateContentAsync(
            JSON.stringify(updatedCardData), 
            { 
                contentType: 'petCardMetadata',
                userId: userId 
            }
        );

        if (!validationResult.isValid && validationResult.riskLevel === 'critical') {
            console.error('Critical security violation detected in evolution data:', validationResult.violations);
            await logEvolutionEvent(cardId, userId, currentStage, targetStage, false, 'Critical security violation in evolution data');
            
            return res.status(400).json({
                error: 'Content blocked',
                message: 'Evolution data contains dangerous elements and has been blocked.',
                violations: validationResult.violations.length,
                code: 'EVOLUTION_DATA_BLOCKED'
            });
        }

        if (validationResult.violations.length > 0) {
            console.warn(`Evolution data validation found ${validationResult.violations.length} violations (risk level: ${validationResult.riskLevel})`);
        }

        // Update card in Firestore
        console.log('Updating card in Firestore');
        const finalCardData = await updateCardInFirestore(cardId, updatedCardData);

        // Log successful evolution
        await logEvolutionEvent(cardId, userId, currentStage, targetStage, true);

        // Return success response
        const response = {
            success: true,
            cardId: cardId,
            card: finalCardData,
            evolution: {
                fromStage: currentStage,
                toStage: targetStage,
                stageName: EVOLUTION_STAGES[targetStage]?.name || `Stage ${targetStage}`,
                statsGained: Object.keys(evolvedStats).reduce((gains, statName) => {
                    gains[statName] = evolvedStats[statName] - (cardData.stats[statName] || 0);
                    return gains;
                }, {}),
                effects: evolutionResult.evolutionEffects || []
            },
            message: `Card successfully evolved to ${EVOLUTION_STAGES[targetStage]?.name || `Stage ${targetStage}`}`,
            timestamp: new Date().toISOString()
        };

        console.log('Card evolution completed successfully');
        return res.status(200).json(response);

    } catch (error) {
        console.error('Error in evolveCard function:', error);
        
        // Log failed evolution
        if (cardId && userId && currentStage) {
            await logEvolutionEvent(cardId, userId, currentStage, null, false, error.message);
        }

        // Handle specific error types
        if (error.message === 'Card not found') {
            return res.status(404).json({
                error: 'Not found',
                message: 'Card not found',
                timestamp: new Date().toISOString()
            });
        }

        if (error.message.includes('Unauthorized')) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to evolve this card',
                timestamp: new Date().toISOString()
            });
        }

        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to evolve card',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = { evolveCard };
