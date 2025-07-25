/**
 * Security Status Indicator Component
 * Shows security status and sanitization information to users
 */

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Info,
  Eye,
  EyeOff
} from 'lucide-react';
import { securityPolicyManager } from '@/services/securityPolicyManager';

interface SecurityStatusIndicatorProps {
  contentType: 'pet_card_metadata' | 'user_profile' | 'comments' | 'social_sharing';
  sanitizationInfo?: {
    violationsFound: number;
    violations: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
    }>;
    lastSanitized: Date;
    sanitizationVersion: string;
  };
  className?: string;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SecurityStatusIndicator: React.FC<SecurityStatusIndicatorProps> = ({
  contentType,
  sanitizationInfo,
  className = '',
  showDetails = true,
  size = 'md'
}) => {
  const [securityPolicy, setSecurityPolicy] = useState(null);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  useEffect(() => {
    loadSecurityPolicy();
  }, [contentType]);

  const loadSecurityPolicy = async () => {
    try {
      const policy = await securityPolicyManager.getPolicyForContentType(contentType);
      setSecurityPolicy(policy);
    } catch (error) {
      console.error('Failed to load security policy:', error);
    }
  };

  const getSecurityStatus = () => {
    if (!sanitizationInfo) {
      return {
        status: 'unknown',
        icon: Shield,
        color: 'bg-gray-100 text-gray-600',
        label: 'Unknown',
        description: 'Security status not available'
      };
    }

    if (sanitizationInfo.violationsFound === 0) {
      return {
        status: 'clean',
        icon: ShieldCheck,
        color: 'bg-green-100 text-green-700',
        label: 'Secure',
        description: 'Content passed all security checks'
      };
    }

    const hasCriticalViolations = sanitizationInfo.violations?.some(v => v.severity === 'critical');
    const hasHighViolations = sanitizationInfo.violations?.some(v => v.severity === 'high');

    if (hasCriticalViolations) {
      return {
        status: 'critical',
        icon: ShieldAlert,
        color: 'bg-red-100 text-red-700',
        label: 'Critical Issues',
        description: 'Critical security violations were found and resolved'
      };
    }

    if (hasHighViolations) {
      return {
        status: 'warning',
        icon: ShieldAlert,
        color: 'bg-orange-100 text-orange-700',
        label: 'Security Issues',
        description: 'Security violations were found and resolved'
      };
    }

    return {
      status: 'sanitized',
      icon: ShieldCheck,
      color: 'bg-blue-100 text-blue-700',
      label: 'Sanitized',
      description: 'Minor security issues were found and resolved'
    };
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          badge: 'text-xs px-2 py-1',
          icon: 'w-3 h-3',
          text: 'text-xs'
        };
      case 'lg':
        return {
          badge: 'text-sm px-3 py-2',
          icon: 'w-5 h-5',
          text: 'text-sm'
        };
      default:
        return {
          badge: 'text-xs px-2 py-1',
          icon: 'w-4 h-4',
          text: 'text-xs'
        };
    }
  };

  const securityStatus = getSecurityStatus();
  const sizeClasses = getSizeClasses();
  const StatusIcon = securityStatus.icon;

  if (!showDetails) {
    return (
      <Badge className={`${securityStatus.color} ${sizeClasses.badge} ${className}`}>
        <StatusIcon className={`${sizeClasses.icon} mr-1`} />
        {securityStatus.label}
      </Badge>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`${securityStatus.color} ${sizeClasses.badge} ${className} hover:opacity-80`}
        >
          <StatusIcon className={`${sizeClasses.icon} mr-1`} />
          {securityStatus.label}
          <Info className="w-3 h-3 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <StatusIcon className="w-4 h-4" />
              <span>Security Status</span>
            </CardTitle>
            <CardDescription className={sizeClasses.text}>
              {securityStatus.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sanitizationInfo && (
              <>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="font-medium">Violations Found</div>
                    <div className="text-gray-600">{sanitizationInfo.violationsFound}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="font-medium">Last Checked</div>
                    <div className="text-gray-600">
                      {new Date(sanitizationInfo.lastSanitized).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {sanitizationInfo.violations && sanitizationInfo.violations.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Security Issues Resolved</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsDetailsVisible(!isDetailsVisible)}
                        className="h-6 px-2"
                      >
                        {isDetailsVisible ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                    
                    {isDetailsVisible && (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {sanitizationInfo.violations.map((violation, index) => (
                          <div
                            key={index}
                            className={`text-xs p-2 rounded border-l-2 ${
                              violation.severity === 'critical'
                                ? 'bg-red-50 border-red-300 text-red-700'
                                : violation.severity === 'high'
                                ? 'bg-orange-50 border-orange-300 text-orange-700'
                                : violation.severity === 'medium'
                                ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                                : 'bg-blue-50 border-blue-300 text-blue-700'
                            }`}
                          >
                            <div className="font-medium capitalize">
                              {violation.type.replace('_', ' ')} ({violation.severity})
                            </div>
                            <div className="text-xs opacity-80">
                              {violation.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t">
                  <div className="flex items-center space-x-2 text-xs text-gray-600">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span>Content is safe to display</span>
                  </div>
                </div>
              </>
            )}

            {securityPolicy && (
              <div className="pt-2 border-t">
                <div className="text-xs text-gray-600">
                  <div className="font-medium mb-1">Security Policy: {contentType}</div>
                  <div>
                    Allowed tags: {securityPolicy.allowedTags?.length || 0} • 
                    Allowed attributes: {Object.keys(securityPolicy.allowedAttributes || {}).length}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};

export default SecurityStatusIndicator;