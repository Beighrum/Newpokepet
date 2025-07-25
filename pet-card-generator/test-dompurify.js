/**
 * Simple test to verify DOMPurify integration
 */

// Test frontend sanitization
import sanitizationService from './src/services/sanitization.ts';

// Test backend sanitization
const backendSanitization = require('./functions/config/sanitization-config.js');

console.log('Testing DOMPurify Integration...\n');

// Test malicious content
const maliciousContent = `
  <p>Hello <b>World</b>!</p>
  <script>alert('XSS Attack!');</script>
  <img src="x" onerror="alert('Image XSS')">
  <div onclick="alert('Click XSS')">Click me</div>
`;

console.log('Original content:', maliciousContent);

// Test backend sanitization
console.log('\n--- Backend Sanitization Test ---');
const backendResult = backendSanitization.sanitizeHTML(maliciousContent, 'defaultPolicy');
console.log('Sanitized content:', backendResult.sanitizedContent);
console.log('Removed elements:', backendResult.removedElements);
console.log('Security violations:', backendResult.securityViolations.length);
console.log('Processing time:', backendResult.processingTime + 'ms');
console.log('Is valid:', backendResult.isValid);

console.log('\n--- Frontend Sanitization Test ---');
try {
  const frontendResult = sanitizationService.sanitizeSync(maliciousContent);
  console.log('Sanitized content:', frontendResult.sanitizedContent);
  console.log('Removed elements:', frontendResult.removedElements);
  console.log('Security violations:', frontendResult.securityViolations.length);
  console.log('Processing time:', frontendResult.processingTime + 'ms');
  console.log('Is valid:', frontendResult.isValid);
} catch (error) {
  console.log('Frontend test requires browser environment');
}

console.log('\nDOMPurify integration test completed!');