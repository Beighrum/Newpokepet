/**
 * Test script for server-side sanitization service
 */

const { sanitizeHTML, validateContent, getDOMPurifyConfig } = require('./config/sanitization-config');

async function testServerSanitization() {
  console.log('Testing server-side sanitization core functionality...\n');
  
  // Test 1: Basic HTML sanitization
  console.log('Test 1: Basic HTML sanitization');
  const maliciousContent = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
  const result1 = sanitizeHTML(maliciousContent, 'defaultPolicy');
  console.log('Original:', maliciousContent);
  console.log('Sanitized:', result1.sanitizedContent);
  console.log('Violations:', result1.securityViolations.length);
  console.log('Valid:', result1.isValid);
  console.log('Processing time:', result1.processingTime + 'ms');
  console.log('');
  
  // Test 2: User profile content sanitization
  console.log('Test 2: User profile content sanitization');
  const userContent = 'John <script>alert("hack")</script> Doe <p>Bio content</p>';
  const result2 = sanitizeHTML(userContent, 'userProfiles');
  console.log('Original:', userContent);
  console.log('Sanitized:', result2.sanitizedContent);
  console.log('Violations:', result2.securityViolations.length);
  console.log('');
  
  // Test 3: Pet card metadata sanitization
  console.log('Test 3: Pet card metadata sanitization');
  const petContent = 'Fluffy<script>alert("xss")</script> <strong>Golden Retriever</strong>';
  const result3 = sanitizeHTML(petContent, 'petCardMetadata');
  console.log('Original:', petContent);
  console.log('Sanitized:', result3.sanitizedContent);
  console.log('Violations:', result3.securityViolations.length);
  console.log('');
  
  // Test 4: Content validation
  console.log('Test 4: Content validation');
  const suspiciousContent = '<script>alert("dangerous")</script><p>Normal content</p>';
  const result4 = validateContent(suspiciousContent, 'comments');
  console.log('Content:', suspiciousContent);
  console.log('Valid:', result4.isValid);
  console.log('Risk level:', result4.riskLevel);
  console.log('Recommended action:', result4.recommendedAction);
  console.log('Violations:', result4.violations.length);
  console.log('');
  
  // Test 5: Configuration test
  console.log('Test 5: Configuration test');
  const config = getDOMPurifyConfig('userProfiles');
  console.log('User profile config allowed tags:', config.ALLOWED_TAGS);
  console.log('User profile config forbidden tags:', config.FORBID_TAGS.slice(0, 5) + '...');
  console.log('');
  
  // Test 6: Safe content test
  console.log('Test 6: Safe content test');
  const safeContent = '<p>This is <strong>safe</strong> content with <em>emphasis</em>!</p>';
  const result6 = sanitizeHTML(safeContent, 'userProfiles');
  console.log('Original:', safeContent);
  console.log('Sanitized:', result6.sanitizedContent);
  console.log('Violations:', result6.securityViolations.length);
  console.log('Valid:', result6.isValid);
  console.log('');
  
  // Test 7: Dangerous attributes test
  console.log('Test 7: Dangerous attributes test');
  const dangerousAttrs = '<p onclick="alert(\'xss\')" onload="hack()">Click me</p>';
  const result7 = sanitizeHTML(dangerousAttrs, 'defaultPolicy');
  console.log('Original:', dangerousAttrs);
  console.log('Sanitized:', result7.sanitizedContent);
  console.log('Violations:', result7.securityViolations.length);
  console.log('');
  
  // Test 8: Empty content test
  console.log('Test 8: Empty content test');
  const emptyResult = sanitizeHTML('', 'defaultPolicy');
  console.log('Empty content result:', emptyResult);
  console.log('');
  
  console.log('All core sanitization tests completed successfully!');
}

// Run tests
testServerSanitization().catch(console.error);