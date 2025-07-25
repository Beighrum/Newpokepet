/**
 * Tests for client-side sanitization service
 */

import { describe, it, expect } from 'vitest';
import { sanitizationService } from './sanitization';
import { ContentType } from '../types/sanitization';

describe('ClientSanitizationService', () => {
  it('should sanitize malicious script tags', () => {
    const maliciousContent = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizationService.sanitizeSync(maliciousContent);
    
    expect(result.sanitizedContent).toBe('<p>Hello</p>');
    expect(result.securityViolations).toHaveLength(1);
    expect(result.securityViolations[0].type).toBe('script_tag');
    expect(result.isValid).toBe(false);
  });

  it('should preserve safe HTML content', () => {
    const safeContent = '<p>Hello <strong>world</strong>!</p>';
    const result = sanitizationService.sanitizeSync(safeContent);
    
    expect(result.sanitizedContent).toBe('<p>Hello <strong>world</strong>!</p>');
    expect(result.securityViolations).toHaveLength(0);
    expect(result.isValid).toBe(true);
  });

  it('should handle empty content gracefully', () => {
    const result = sanitizationService.sanitizeSync('');
    
    expect(result.sanitizedContent).toBe('');
    expect(result.securityViolations).toHaveLength(0);
    expect(result.isValid).toBe(true);
  });

  it('should sanitize dangerous attributes', () => {
    const dangerousContent = '<p onclick="alert(\'xss\')">Click me</p>';
    const result = sanitizationService.sanitizeSync(dangerousContent);
    
    expect(result.sanitizedContent).toBe('<p>Click me</p>');
    expect(result.securityViolations.length).toBeGreaterThan(0);
  });

  it('should work asynchronously', async () => {
    const content = '<p>Test content</p>';
    const result = await sanitizationService.sanitizeHTML(content);
    
    expect(result.sanitizedContent).toBe('<p>Test content</p>');
    expect(result.isValid).toBe(true);
  });

  it('should validate content correctly', async () => {
    const maliciousContent = '<script>alert("xss")</script>';
    const result = await sanitizationService.validateContent(maliciousContent, ContentType.GENERAL);
    
    expect(result.isValid).toBe(false);
    expect(result.riskLevel).toBe('critical');
    expect(result.recommendedAction).toBe('block');
  });

  it('should get correct config for content types', () => {
    const userProfileConfig = sanitizationService.getConfigForContentType(ContentType.USER_PROFILE);
    const petCardConfig = sanitizationService.getConfigForContentType(ContentType.PET_CARD_METADATA);
    
    expect(userProfileConfig.allowedTags).toContain('p');
    expect(petCardConfig.allowedTags).not.toContain('p');
  });

  it('should track processing time', () => {
    const content = '<p>Test content</p>';
    const result = sanitizationService.sanitizeSync(content);
    
    expect(result.processingTime).toBeGreaterThan(0);
    expect(typeof result.processingTime).toBe('number');
  });
});