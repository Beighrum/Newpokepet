/**
 * TypeScript type definitions for security event logging
 */

import { SecurityViolation, ContentType } from './sanitization';

// Security event log entry
export interface SecurityEventLog {
  id: string;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  endpoint: string;
  violations: SecurityViolation[];
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  contentType: ContentType;
  originalContent?: string;
  sanitizedContent?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

// Audit log entry for content sanitization actions
export interface AuditLog {
  id: string;
  userId?: string;
  action: 'sanitize' | 'block' | 'flag' | 'allow';
  contentType: ContentType;
  originalContent: string;
  sanitizedContent: string;
  violations: SecurityViolation[];
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  endpoint?: string;
  sessionId?: string;
  requestId?: string;
  processingTime: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

// Security metrics for monitoring
export interface SecurityMetrics {
  totalSanitizations: number;
  violationsBlocked: number;
  averageProcessingTime: number;
  topViolationTypes: Record<string, number>;
  suspiciousUsers: string[];
  performanceImpact: number;
  timeWindow: {
    start: Date;
    end: Date;
  };
  riskLevelDistribution: Record<string, number>;
}

// Security event context
export interface SecurityEventContext {
  userId?: string;
  ipAddress: string;
  userAgent: string;
  endpoint: string;
  sessionId?: string;
  requestId?: string;
  contentType: ContentType;
  originalContent?: string;
  sanitizedContent?: string;
  metadata?: Record<string, any>;
}

// Rate limiting information
export interface RateLimitInfo {
  userId: string;
  violationCount: number;
  timeWindow: number; // in milliseconds
  isExceeded: boolean;
  resetTime: Date;
  maxViolations: number;
}

// Security alert configuration
export interface SecurityAlertConfig {
  enabled: boolean;
  thresholds: {
    criticalViolations: number;
    highViolations: number;
    rateLimitExceeded: number;
    performanceThreshold: number; // in milliseconds
  };
  alertChannels: {
    sentry: boolean;
    email: boolean;
    webhook?: string;
  };
  suppressionRules: {
    duplicateWindow: number; // in milliseconds
    maxAlertsPerHour: number;
  };
}

// Security dashboard data
export interface SecurityDashboardData {
  metrics: SecurityMetrics;
  recentEvents: SecurityEventLog[];
  topViolators: Array<{
    userId: string;
    violationCount: number;
    lastViolation: Date;
    riskScore: number;
  }>;
  systemHealth: {
    sanitizationServiceStatus: 'healthy' | 'degraded' | 'down';
    averageResponseTime: number;
    errorRate: number;
    lastHealthCheck: Date;
  };
  alerts: Array<{
    id: string;
    type: 'rate_limit' | 'critical_violation' | 'performance' | 'system_error';
    message: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    timestamp: Date;
    acknowledged: boolean;
  }>;
}

// Security event logger interface
export interface SecurityEventLogger {
  logSecurityEvent(event: Omit<SecurityEventLog, 'id' | 'timestamp'>): Promise<void>;
  createAuditLog(audit: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void>;
  getSecurityMetrics(timeWindow?: { start: Date; end: Date }): Promise<SecurityMetrics>;
  checkRateLimit(userId: string, timeWindowMs?: number): Promise<RateLimitInfo>;
  getRecentEvents(limit?: number, severity?: SecurityEventLog['severity']): Promise<SecurityEventLog[]>;
  getDashboardData(): Promise<SecurityDashboardData>;
  acknowledgeAlert(alertId: string): Promise<void>;
}

// Firestore document interfaces
export interface SecurityEventLogDocument {
  userId?: string;
  ipAddress: string;
  userAgent: string;
  endpoint: string;
  violations: SecurityViolation[];
  timestamp: any; // Firebase Timestamp
  severity: 'info' | 'warning' | 'error' | 'critical';
  contentType: string;
  originalContent?: string;
  sanitizedContent?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogDocument {
  userId?: string;
  action: 'sanitize' | 'block' | 'flag' | 'allow';
  contentType: string;
  originalContent: string;
  sanitizedContent: string;
  violations: SecurityViolation[];
  timestamp: any; // Firebase Timestamp
  ipAddress: string;
  userAgent: string;
  endpoint?: string;
  sessionId?: string;
  requestId?: string;
  processingTime: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}