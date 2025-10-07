const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const axios = require('axios');

// Initialize Firebase Admin
admin.initializeApp();

// Get configuration
const config = functions.config();

// Simple health check function
exports.health = functions.https.onRequest((req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    config: {
      n8nUrl: config.n8n?.url ? 'configured' : 'missing',
      n8nApiKey: config.n8n?.apikey ? 'configured' : 'missing'
    }
  });
});

// Generate card function
exports.generateCard = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageUrl, userId, options = {} } = req.body;

    // Validate required fields
    if (!imageUrl || !userId) {
      return res.status(400).json({
        error: 'Missing required fields: imageUrl and userId'
      });
    }

    // Verify user authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    if (decodedToken.uid !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Prepare payload for n8n webhook
    const payload = {
      imageUrl,
      userId,
      options: {
        style: options.style || 'realistic',
        variants: options.variants || 1,
        quality: options.quality || 'standard'
      },
      timestamp: new Date().toISOString()
    };

    // Call n8n webhook
    const n8nResponse = await axios.post(config.n8n.url, payload, {
      headers: {
        'Authorization': `Bearer ${config.n8n.apikey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Card generation initiated',
      data: n8nResponse.data,
      requestId: payload.timestamp
    });

  } catch (error) {
    console.error('Error generating card:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({ error: 'Request timeout' });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get user cards function
exports.getUserCards = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.query.userId;
    const { limit = 20, offset = 0, rarity } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }

    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    if (decodedToken.uid !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Query user's cards
    const db = admin.firestore();
    let query = db.collection('cards')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    if (rarity) {
      query = query.where('rarity', '==', rarity);
    }

    const snapshot = await query.get();
    const cards = [];

    snapshot.forEach(doc => {
      cards.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.status(200).json({
      cards,
      total: cards.length,
      hasMore: cards.length === parseInt(limit)
    });

  } catch (error) {
    console.error('Error fetching user cards:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Webhook endpoint for n8n to update card status
exports.updateCardStatus = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { requestId, status, cardData, error } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: 'Missing requestId' });
    }

    const db = admin.firestore();
    
    // Update or create card document
    const cardRef = db.collection('cards').doc();
    const updateData = {
      requestId,
      status: status || 'completed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...cardData
    };

    if (error) {
      updateData.error = error;
      updateData.status = 'failed';
    }

    await cardRef.set(updateData, { merge: true });

    res.status(200).json({
      success: true,
      message: 'Card status updated',
      cardId: cardRef.id
    });

  } catch (error) {
    console.error('Error updating card status:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Card evolution endpoint
exports.evolveCard = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cardId, targetStage } = req.body;

    // Validate required fields
    if (!cardId || !targetStage) {
      return res.status(400).json({
        error: 'Missing required fields: cardId and targetStage'
      });
    }

    // Verify user authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    // 1. Fetch existing card metadata
    const db = admin.firestore();
    const cardSnap = await db.collection('cards').doc(cardId).get();
    
    if (!cardSnap.exists) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const cardData = cardSnap.data();
    
    // Verify user owns the card
    if (cardData.userId !== decodedToken.uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // 2. Call n8n evolve webhook
    const n8nUrl = config.n8n?.evolve_url || 'http://localhost:5678/webhook/evolve';
    const apiKey = config.n8n?.apikey;

    if (!apiKey) {
      return res.status(500).json({ error: 'N8N configuration missing' });
    }

    const payload = {
      cardId,
      targetStage,
      currentCard: cardData
    };

    const n8nResponse = await axios.post(`${n8nUrl}?apiKey=${apiKey}`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    // 3. Optionally persist the evolved card data
    if (n8nResponse.data && n8nResponse.data.stages) {
      const evolvedCard = n8nResponse.data.stages;
      
      // Create new card document for the evolved version
      const newCardRef = db.collection('cards').doc();
      await newCardRef.set({
        ...evolvedCard,
        originalCardId: cardId,
        userId: decodedToken.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update original card to mark it as evolved
      await cardSnap.ref.update({
        hasEvolved: true,
        evolvedToCardId: newCardRef.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.status(200).json({
        success: true,
        message: 'Card evolved successfully',
        evolvedCard: {
          id: newCardRef.id,
          ...evolvedCard
        },
        originalCardId: cardId
      });
    } else {
      res.status(200).json({
        success: true,
        message: 'Evolution initiated',
        data: n8nResponse.data
      });
    }

  } catch (error) {
    console.error('Error evolving card:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({ error: 'Request timeout' });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});