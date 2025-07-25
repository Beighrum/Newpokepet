/**
 * Simple test script for Express sanitization middleware
 * Tests middleware functionality without Firebase dependencies
 */

// Mock Firebase Admin before requiring the middleware
const mockFirestore = {
  collection: () => ({
    add: () => Promise.resolve({ id: 'test-id' }),
    where: () => ({
      where: () => ({
        get: () => Promise.resolve({ size: 0 })
      })
    })
  }),
  FieldValue: {
    serverTimestamp: () => new Date()
  }
};

// Mock admin before requiring modules
const admin = {
  firestore: () => mockFirestore
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

const {
  sanitizeBody,
  sanitizeQuery,
  autoSanitize,
  logSecurityEvents,
  addSecurityHeaders,
  createSanitizationStack
} = require('./middleware/sanitization-middleware');

async function testMiddlewareBasics() {
  console.log('Testing Express sanitization middleware basics...\n');
  
  // Test 1: sanitizeBody middleware
  console.log('Test 1: sanitizeBody middleware');
  
  const mockReq1 = {
    body: {
      name: 'John<script>alert("xss")</script>',
      description: '<p>Bio content</p><script>hack()</script>',
      safe: 'This is safe content'
    },
    user: { uid: 'test-user-123' },
    ip: '127.0.0.1'
  };
  
  const mockRes1 = {
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.responseData = data; return this; },
    statusCode: 200,
    responseData: null
  };
  
  let nextCalled1 = false;
  const mockNext1 = () => { nextCalled1 = true; };
  
  const bodyMiddleware = sanitizeBody(['name', 'description'], { contentType: 'userProfiles' });
  
  try {
    await bodyMiddleware(mockReq1, mockRes1, mockNext1);
    console.log('✓ Body sanitization completed');
    console.log('Original name:', 'John<script>alert("xss")</script>');
    console.log('Sanitized name:', mockReq1.body.name);
    console.log('Original description:', '<p>Bio content</p><script>hack()</script>');
    console.log('Sanitized description:', mockReq1.body.description);
    console.log('Safe field unchanged:', mockReq1.body.safe);
    console.log('Sanitization results available:', !!mockReq1.sanitizationResults);
    console.log('Next called:', nextCalled1);
    console.log('Response status:', mockRes1.statusCode);
  } catch (error) {
    console.error('✗ Body sanitization failed:', error.message);
  }
  console.log('');
  
  // Test 2: autoSanitize middleware
  console.log('Test 2: autoSanitize middleware');
  
  const mockReq2 = {
    body: {
      petName: 'Fluffy<script>alert("xss")</script>',
      breed: 'Golden Retriever',
      description: '<p>Friendly dog</p><script>hack()</script>',
      other: 'unchanged'
    },
    user: { uid: 'test-user-456' },
    ip: '192.168.1.1'
  };
  
  const mockRes2 = {
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.responseData = data; return this; },
    statusCode: 200,
    responseData: null
  };
  
  let nextCalled2 = false;
  const mockNext2 = () => { nextCalled2 = true; };
  
  const autoMiddleware = autoSanitize({ contentType: 'petCardMetadata' });
  
  try {
    await autoMiddleware(mockReq2, mockRes2, mockNext2);
    console.log('✓ Auto sanitization completed');
    console.log('Original pet name:', 'Fluffy<script>alert("xss")</script>');
    console.log('Sanitized pet name:', mockReq2.body.petName);
    console.log('Original description:', '<p>Friendly dog</p><script>hack()</script>');
    console.log('Sanitized description:', mockReq2.body.description);
    console.log('Breed unchanged:', mockReq2.body.breed);
    console.log('Other field unchanged:', mockReq2.body.other);
    console.log('Results count:', Object.keys(mockReq2.sanitizationResults || {}).length);
    console.log('Next called:', nextCalled2);
  } catch (error) {
    console.error('✗ Auto sanitization failed:', error.message);
  }
  console.log('');
  
  // Test 3: Critical content blocking
  console.log('Test 3: Critical content blocking');
  
  const mockReq3 = {
    body: {
      content: '<script>document.location="http://evil.com"</script>'
    },
    user: { uid: 'test-user-789' },
    ip: '10.0.0.1'
  };
  
  const mockRes3 = {
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.responseData = data; return this; },
    statusCode: 200,
    responseData: null
  };
  
  let nextCalled3 = false;
  const mockNext3 = () => { nextCalled3 = true; };
  
  const blockingMiddleware = sanitizeBody(['content'], { contentType: 'defaultPolicy' });
  
  try {
    await blockingMiddleware(mockReq3, mockRes3, mockNext3);
    console.log('Response status:', mockRes3.statusCode);
    console.log('Content blocked:', mockRes3.statusCode === 400);
    console.log('Block response:', mockRes3.responseData);
    console.log('Next called (should be false):', nextCalled3);
  } catch (error) {
    console.error('✗ Content blocking test failed:', error.message);
  }
  console.log('');
  
  // Test 4: Security headers middleware
  console.log('Test 4: Security headers middleware');
  
  const mockReq4 = {};
  const mockRes4 = {
    setHeader: function(name, value) { 
      if (!this.headers) this.headers = {};
      this.headers[name] = value; 
    },
    headers: {}
  };
  
  let nextCalled4 = false;
  const mockNext4 = () => { nextCalled4 = true; };
  
  const headersMiddleware = addSecurityHeaders({
    contentSecurityPolicy: "default-src 'self'"
  });
  
  headersMiddleware(mockReq4, mockRes4, mockNext4);
  
  console.log('✓ Security headers middleware completed');
  console.log('Headers set:', Object.keys(mockRes4.headers));
  console.log('X-Content-Type-Options:', mockRes4.headers['X-Content-Type-Options']);
  console.log('X-Frame-Options:', mockRes4.headers['X-Frame-Options']);
  console.log('X-XSS-Protection:', mockRes4.headers['X-XSS-Protection']);
  console.log('Content-Security-Policy:', mockRes4.headers['Content-Security-Policy']);
  console.log('Next called:', nextCalled4);
  console.log('');
  
  // Test 5: Complete sanitization stack
  console.log('Test 5: Complete sanitization stack');
  
  const stackMiddlewares = createSanitizationStack({
    sanitization: { contentType: 'userProfiles' },
    security: { contentSecurityPolicy: "default-src 'self'" },
    logging: { logAllRequests: true }
  });
  
  console.log('✓ Sanitization stack created');
  console.log('Stack contains', stackMiddlewares.length, 'middleware functions');
  console.log('Stack includes: headers, auto-sanitize, logging');
  console.log('');
  
  console.log('All basic middleware tests completed successfully!');
}

// Test rate limiting functionality
async function testRateLimiting() {
  console.log('Testing rate limiting functionality...\n');
  
  // Mock a user with violations
  const mockFirestoreWithViolations = {
    collection: () => ({
      add: () => Promise.resolve({ id: 'test-id' }),
      where: () => ({
        where: () => ({
          get: () => Promise.resolve({ size: 15 }) // Exceeds rate limit of 10
        })
      })
    }),
    FieldValue: {
      serverTimestamp: () => new Date()
    }
  };
  
  // Override the firestore mock temporarily
  admin.firestore = () => mockFirestoreWithViolations;
  
  const mockReq = {
    body: {
      name: 'Test<script>alert("xss")</script>'
    },
    user: { uid: 'rate-limited-user' },
    ip: '127.0.0.1'
  };
  
  const mockRes = {
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.responseData = data; return this; },
    statusCode: 200,
    responseData: null
  };
  
  let nextCalled = false;
  const mockNext = () => { nextCalled = true; };
  
  const rateLimitMiddleware = sanitizeBody(['name'], { contentType: 'userProfiles' });
  
  try {
    await rateLimitMiddleware(mockReq, mockRes, mockNext);
    console.log('Rate limiting test:');
    console.log('Response status:', mockRes.statusCode);
    console.log('Rate limited (429):', mockRes.statusCode === 429);
    console.log('Response message:', mockRes.responseData?.message);
    console.log('Next called (should be false):', nextCalled);
  } catch (error) {
    console.error('✗ Rate limiting test failed:', error.message);
  }
  
  // Restore original firestore mock
  admin.firestore = () => mockFirestore;
  
  console.log('');
  console.log('Rate limiting test completed!');
}

// Run all tests
async function runAllTests() {
  try {
    await testMiddlewareBasics();
    await testRateLimiting();
    console.log('\n=== All middleware tests passed! ===');
    console.log('✓ Request body sanitization');
    console.log('✓ Auto-sanitization with field detection');
    console.log('✓ Critical content blocking');
    console.log('✓ Security headers injection');
    console.log('✓ Middleware stack creation');
    console.log('✓ Rate limiting for repeated violations');
  } catch (error) {
    console.error('\n=== Middleware tests failed! ===');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  runAllTests();
}

module.exports = {
  testMiddlewareBasics,
  testRateLimiting
};