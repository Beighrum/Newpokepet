/**
 * TypeScript type definitions for DOMPurify sanitization interfaces
 */

// DOMPurify configuration options
export interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  allowedSchemes?: string[];
  allowedSchemesByTag?: Record<string, string[]>;
  stripIgnoreTag?: boolean;
  stripIgnoreTagBody?: string[];
  keepContent?: boolean;
  forbidTags?: string[];
  forbidAttr?: string[];
  allowDataAttr?: boolean;
  allowUnknownProtocols?: boolean;
  sanitizeDOM?: boolean;
  wholeDocument?: boolean;
  returnDOM?: boolean;
  returnDOMFragment?: boolean;
  returnTrustedType?: boolean;
}

// Security violation types
export type SecurityViolationType = 
  | 'script_tag' 
  | 'dangerous_attribute' 
  | 'suspicious_pattern'
  | 'malicious_url'
  | 'dom_clobbering'
  | 'prototype_pollution';

// Security violation details
export interface SecurityViolation {
  type: SecurityViolationType;
  originalContent: string;
  sanitizedContent: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  removedElements?: string[];
}

// Result of sanitization operation
export interface SanitizedResult {
  sanitizedContent: string;
  originalContent: string;
  removedElements: string[];
  securityViolations: SecurityViolation[];
  processingTime: number;
  isValid: boolean;
}

// Content validation result
export interface ValidationResult {
  isValid: boolean;
  violations: SecurityViolation[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendedAction: 'allow' | 'sanitize' | 'block' | 'flag';
  confidence: number;
}

// DOMPurify configuration for different content types
export interface DOMPurifyConfig {
  allowedTags: string[];
  allowedAttributes: Record<string, string[]>;
  allowedSchemes: string[];
  allowedSchemesByTag: Record<string, string[]>;
  stripIgnoreTag: boolean;
  stripIgnoreTagBody: string[];
  keepContent: boolean;
  forbidTags: string[];
  forbidAttr: string[];
}

// Security policy configuration
export interface SecurityPolicy {
  userProfiles: DOMPurifyConfig;
  petCardMetadata: DOMPurifyConfig;
  comments: DOMPurifyConfig;
  socialSharing: DOMPurifyConfig;
  defaultPolicy: DOMPurifyConfig;
}

// Content type enumeration
export enum ContentType {
  USER_PROFILE = 'user_profile',
  PET_CARD_METADATA = 'pet_card_metadata',
  COMMENT = 'comment',
  SOCIAL_SHARING = 'social_sharing',
  GENERAL = 'general'
}

// Sanitization service interface
export interface SanitizationService {
  sanitizeHTML(content: string, options?: SanitizeOptions): Promise<SanitizedResult>;
  sanitizeSync(content: string, options?: SanitizeOptions): SanitizedResult;
  validateContent(content: string, contentType?: ContentType): Promise<ValidationResult>;
  getConfigForContentType(contentType: ContentType): DOMPurifyConfig;
  updateSecurityPolicy(policy: Partial<SecurityPolicy>): void;
}

// React hook return type
export interface UseSanitizedContentHook {
  sanitize: (content: string, options?: SanitizeOptions) => string;
  sanitizeAsync: (content: string, options?: SanitizeOptions) => Promise<string>;
  isLoading: boolean;
  error: Error | null;
  lastResult: SanitizedResult | null;
  clearCache: () => void;
  cleanup: () => void;
}

// Sanitized input component props
export interface SanitizedInputProps {
  value: string;
  onChange: (sanitizedValue: string) => void;
  placeholder?: string;
  allowedTags?: string[];
  maxLength?: number;
  contentType?: ContentType;
  onSecurityViolation?: (violation: SecurityViolation) => void;
  className?: string;
  disabled?: boolean;
}

// Sanitized textarea component props
export interface SanitizedTextAreaProps extends SanitizedInputProps {
  rows?: number;
  autoResize?: boolean;
  minRows?: number;
  maxRows?: number;
}

// Safe HTML display component props
export interface SafeHTMLDisplayProps {
  content: string;
  className?: string;
  contentType?: ContentType;
  fallbackComponent?: React.ComponentType;
  onRenderError?: (error: Error) => void;
  allowInteractivity?: boolean;
}

// Pet card safe display props
export interface PetCardSafeDisplayProps {
  card: PetCard;
  showMetadata: boolean;
  onContentError?: (error: ContentError) => void;
  sanitizationOptions?: SanitizeOptions;
}

// Enhanced pet card with sanitization info
export interface SanitizedPetCard extends Omit<PetCard, 'metadata'> {
  metadata?: SanitizedCardMetadata;
  sanitizationInfo: {
    lastSanitized: Date;
    violationsFound: number;
    sanitizationVersion: string;
    isValid: boolean;
  };
}

// Sanitized card metadata
export interface SanitizedCardMetadata {
  petName: string; // Always sanitized
  breed?: string; // Always sanitized
  description?: string; // Sanitized HTML allowed
  customTags?: string[]; // Array of sanitized tags
  sanitizedFields: string[]; // List of fields that were sanitized
  // Original metadata fields
  filename?: string;
  contentType?: string;
  fileSize?: number;
  processingStatus?: string;
  enhancedBackground?: boolean;
  lastEvolution?: string;
  evolutionProcessingStatus?: string;
}

// Enhanced user profile with sanitization
export interface SanitizedUserProfile extends User {
  displayName: string; // Sanitized
  bio?: string; // Sanitized HTML allowed
  sanitizationInfo: {
    lastUpdated: Date;
    profileVersion: string;
    violationsCount: number;
  };
}

// Content error interface
export interface ContentError extends Error {
  type: 'sanitization_failed' | 'validation_failed' | 'render_failed';
  contentType: ContentType;
  originalContent?: string;
  violations?: SecurityViolation[];
}

// Base interfaces (these would typically come from your existing types)
export interface PetCard {
  id: string;
  petName: string;
  petType: string;
  rarity: string;
  stats: Record<string, number>;
  images: {
    original?: string;
    processed?: string;
    evolved?: string;
  };
  evolution?: {
    stage: number;
    maxStage: number;
    canEvolve: boolean;
    evolutionRequirements?: {
      minLevel?: number;
      requiredStats?: Record<string, number>;
    };
    evolutionHistory?: Array<{
      fromStage: number;
      toStage: number;
      timestamp: string;
      statsGained: Record<string, number>;
    }>;
  };
  metadata?: {
    filename?: string;
    contentType?: string;
    fileSize?: number;
    processingStatus?: string;
    enhancedBackground?: boolean;
    lastEvolution?: string;
    evolutionProcessingStatus?: string;
  };
  level?: number;
  userId: string;
  createdAt: any; // Firebase Timestamp
  updatedAt?: any; // Firebase Timestamp
  version?: number;
}

export interface CardMetadata {
  petName: string;
  breed?: string;
  description?: string;
  customTags?: string[];
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  bio?: string;
  createdAt: any; // Firebase Timestamp
}