// Simple test to verify DOMPurify works
import DOMPurify from 'dompurify';

console.log('DOMPurify object:', DOMPurify);
console.log('DOMPurify.sanitize function:', typeof DOMPurify.sanitize);

try {
  const result = DOMPurify.sanitize('<p>Hello <script>alert("xss")</script>world</p>');
  console.log('Sanitization result:', result);
} catch (error) {
  console.error('Error:', error);
}