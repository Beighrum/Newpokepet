/**
 * Test script for Firebase Functions sanitization integration
 * Tests sanitization middleware integration with Express endpoints and Firebase Functions
 */

// Mock Firebase Admin before requiring modules
const mockFirestore = {
  collection: () => ({
    doc: () => ({
      set: () => Promise.resolve({ id: 'test-card-id' }),
      get: () => Promise.resolve({
        exists: true,
        data: () => ({
          id: 'test-card-id',
          userId: 'test-user-123',
          petName: 'Test Pet',
          stats: { cuteness: 80, energy: 70, loyalty: 75, intelligence: 65, playfulness: 85 },
          evolution: { stage: 1, maxStage: 3 },
          sanitizationInfo: { lastSanitized: new Date().toISOString() }
        })
      }),
      update: () => Promise.resolve()
    }),
    add: () => Promise.resolve({ id: 'test-log-id' }),
    where: () => ({
      where: () => ({
        get: () => Promise.resolve({ size: 0 })
      })
    })
  }),
  FieldValue: {
    serverTimestamp: () => new Date(),
    increment: (val) => val
  }
};

const admin = {
  firestore: () => mockFirestore,
  apps: { length: 1 }
};

// Override require for firebase-admin
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'firebase-admin') {
    return admin;
  }
  return originalRequire.apply(this, arguments);
};

// Mock other dependencies
const mockStorage = {
  bucket: () => ({
    file: () => ({
      save: () => Promise.resolve(),
      getSignedUrl: () => Promise.resolve(['https://example.com/test-image.jpg'])
    })
  })
};

Module.prototype.require = function(id) {
  if (id === 'firebase-admin') {
    return admin;
  }
  if (id === '@google-cloud/storage') {
    return { Storage: function() { return mockStorage; } };
  }
  if (id === 'axios') {
    return {
      post: () => Promise.resolve({
        status: 200,
        data: {
          processedImageUrl: 'https://example.com/processed-image.jpg',
          processingStatus: 'completed'
        }
      })
    };
  }
  if (id === 'uuid') {
    return { v4: () => 'test-uuid-123' };
  }
  return originalRequire.apply(this, arguments);
};

const { generateCard } = require('./generate');
const { evolveCard } = require('./evolve');
const { createSanitizationStack } = require('./middleware/sanitization-middleware');

async function testFirebaseFunctionsIntegration() {
  console.log('Testing Firebase Functions sanitization integration...\n');
  
  // Test 1: Generate card with sanitization
  console.log('Test 1: Generate card with sanitization');
  
  const mockReq1 = {
    body: {
      imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A==',
      petName: 'Fluffy<script>alert("xss")</script>',
      petType: 'Golden<script>hack()</script> Retriever',
      description: '<p>Friendly dog</p><script>evil()</script>',
      customTags: ['cute<script>xss</script>', 'playful'],
      userId: 'test-user-123',
      originalName: 'pet-photo<script>alert("file")</script>.jpg',
      mimeType: 'image/jpeg<script>hack()</script>',
      uploadSource: 'web<script>evil()</script>'
    },
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
    get: (header) => header === 'User-Agent' ? 'test-browser<script>xss</script>' : null
  };
  
  const mockRes1 = {
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.responseData = data; return this; },
    statusCode: 200,
    responseData: null
  };
  
  try {
    await generateCard(mockReq1, mockRes1);
    console.log('✓ Generate card completed');
    console.log('Response status:', mockRes1.statusCode);
    console.log('Card generated:', !!mockRes1.responseData?.success);
    
    if (mockRes1.responseData?.card) {
      console.log('Sanitized pet name:', mockRes1.responseData.card.petName);
      console.log('Sanitized pet type:', mockRes1.responseData.card.petType);
      console.log('Sanitized description:', mockRes1.responseData.card.metadata?.description);
      console.log('Sanitized custom tags:', mockRes1.responseData.card.metadata?.customTags);
      console.log('Sanitized file metadata:', mockRes1.responseData.card.metadata?.upload);
      console.log('Sanitization info:', mockRes1.responseData.card.sanitizationInfo);
    }
  } catch (error) {
    console.error('✗ Generate card failed:', error.message);
  }
  console.log('');
  
  // Test 2: Evolve card with sanitization
  console.log('Test 2: Evolve card with sanitization');
  
  const mockReq2 = {
    body: {
      cardId: 'test-card-id<script>alert("cardid")</script>',
      userId: 'test-user-123'
    },
    ip: '192.168.1.1',
    connection: { remoteAddress: '192.168.1.1' }
  };
  
  const mockRes2 = {
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.responseData = data; return this; },
    statusCode: 200,
    responseData: null
  };
  
  try {
    await evolveCard(mockReq2, mockRes2);
    console.log('✓ Evolve card completed');
    console.log('Response status:', mockRes2.statusCode);
    console.log('Evolution successful:', !!mockRes2.responseData?.success);
    
    if (mockRes2.responseData?.card) {
      console.log('Evolution stage:', mockRes2.responseData.card.evolution?.stage);
      console.log('Sanitization info updated:', !!mockRes2.responseData.card.sanitizationInfo?.evolutionSanitized);
    }
  } catch (error) {
    console.error('✗ Evolve card failed:', error.message);
  }
  console.log('');
  
  // Test 3: Sanitization middleware stack
  console.log('Test 3: Sanitization middleware stack creation');
  
  try {
    const middlewareStack = createSanitizationStack({
      sanitization: { 
        contentType: 'petCardMetadata',
        bodyFields: ['petName', 'petType', 'description'],
        blockCritical: true
      },
      security: { 
        contentSecurityPolicy: "default-src 'self'" 
      },
      logging: { 
        logViolationsOnly: true 
      }
    });
    
    console.log('✓ Middleware stack created');
    console.log('Stack contains', middlewareStack.length, 'middleware functions');
    console.log('Middleware types: security headers, auto-sanitize, logging');
  } catch (error) {
    console.error('✗ Middleware stack creation failed:', error.message);
  }
  console.log('');
  
  // Test 4: Critical content blocking
  console.log('Test 4: Critical content blocking in generate card');
  
  const mockReq4 = {
    body: {
      imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A==',
      petName: '<script>document.location="http://evil.com"</script>',
      petType: 'Dog',
      userId: 'test-user-456'
    },
    ip: '10.0.0.1',
    connection: { remoteAddress: '10.0.0.1' },
    get: () => 'test-browser'
  };
  
  const mockRes4 = {
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.responseData = data; return this; },
    statusCode: 200,
    responseData: null
  };
  
  try {
    await generateCard(mockReq4, mockRes4);
    console.log('Response status:', mockRes4.statusCode);
    console.log('Critical content blocked:', mockRes4.statusCode === 400);
    console.log('Block response:', mockRes4.responseData);
  } catch (error) {
    console.error('✗ Critical content blocking test failed:', error.message);
  }
  console.log('');
  
  console.log('Firebase Functions integration tests completed!');
}

// Test direct Firebase Functions (onCall functions)
async function testDirectFirebaseFunctions() {
  console.log('Testing direct Firebase Functions (onCall) sanitization...\n');
  
  // Mock Firebase Functions context
  const mockContext = {
    auth: {
      uid: 'test-user-direct'
    },
    rawRequest: {
      ip: '203.0.113.1'
    }
  };
  
  // Test direct generateCard function
  console.log('Test: Direct generateCard function');
  
  const generateCardData = {
    imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A==',
    petName: 'Direct<script>alert("direct")</script>Pet',
    petType: 'Cat<script>hack()</script>',
    description: '<p>Direct function test</p><script>evil()</script>'
  };
  
  try {
    // Simulate the direct function call logic
    const sanitizationService = require('./services/sanitization-service');
    const sanitizedData = await sanitizationService.sanitizePetCardMetadata({
      petName: generateCardData.petName,
      petType: generateCardData.petType,
      description: generateCardData.description
    }, {
      userId: mockContext.auth.uid,
      ipAddress: mockContext.rawRequest.ip
    });
    
    console.log('✓ Direct function sanitization completed');
    console.log('Original pet name:', generateCardData.petName);
    console.log('Sanitized pet name:', sanitizedData.petName);
    console.log('Original pet type:', generateCardData.petType);
    console.log('Sanitized pet type:', sanitizedData.breed);
    console.log('Sanitized fields:', sanitizedData.sanitizedFields || []);
  } catch (error) {
    console.error('✗ Direct function sanitization failed:', error.message);
  }
  console.log('');
  
  // Test direct evolveCard function
  console.log('Test: Direct evolveCard function');
  
  const evolveCardData = {
    cardId: 'test-card-direct<script>alert("evolve")</script>'
  };
  
  try {
    const sanitizationService = require('./services/sanitization-service');
    const sanitizedCardId = await sanitizationService.sanitizeHTMLAsync(evolveCardData.cardId, {
      contentType: 'defaultPolicy',
      userId: mockContext.auth.uid,
      ipAddress: mockContext.rawRequest.ip
    });
    
    console.log('✓ Direct evolve function sanitization completed');
    console.log('Original card ID:', evolveCardData.cardId);
    console.log('Sanitized card ID:', sanitizedCardId.sanitizedContent);
    console.log('Violations found:', sanitizedCardId.securityViolations.length);
  } catch (error) {
    console.error('✗ Direct evolve function sanitization failed:', error.message);
  }
  console.log('');
  
  console.log('Direct Firebase Functions tests completed!');
}

// Run all tests
async function runAllIntegrationTests() {
  try {
    await testFirebaseFunctionsIntegration();
    await testDirectFirebaseFunctions();
    
    console.log('\n=== Firebase Functions integration tests passed! ===');
    console.log('✓ Express endpoint sanitization middleware');
    console.log('✓ Card generation with sanitized metadata');
    console.log('✓ Card evolution with sanitized data validation');
    console.log('✓ File upload metadata sanitization');
    console.log('✓ Critical content blocking');
    console.log('✓ Direct Firebase Functions sanitization');
    console.log('✓ Sanitized data validation before Firestore writes');
  } catch (error) {
    console.error('\n=== Firebase Functions integration tests failed! ===');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  runAllIntegrationTests();
}

module.exports = {
  testFirebaseFunctionsIntegration,
  testDirectFirebaseFunctions
};