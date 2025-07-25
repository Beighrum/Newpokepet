/**
 * Security Feature Flags Configuration
 * Enables gradual rollout and instant disable of security features
 */

export interface SecurityFeatureFlags {
  // Core sanitization features
  enhanced_sanitization: boolean;
  strict_xss_protection: boolean;
  advanced_content_filtering: boolean;
  
  // Performance features
  sanitization_caching: boolean;
  lazy_sanitization: boolean;
  batch_processing: boolean;
  worker_sanitization: boolean;
  
  // Monitoring features
  detailed_security_logging: boolean;
  real_time_violation_alerts: boolean;
  performance_monitoring: boolean;
  security_event_tracking: boolean;
  
  // User experience features
  security_status_indicators: boolean;
  content_formatting_help: boolean;
  violation_feedback: boolean;
  safe_content_preview: boolean;
  
  // Emergency controls
  emergency_strict_mode: boolean;
  block_all_html: boolean;
  rate_limiting_strict: boolean;
  suspicious_content_block: boolean;
}

export interface FeatureFlagConfig {
  flag: keyof SecurityFeatureFlags;
  enabled: boolean;
  rolloutPercentage?: number;
  userCriteria?: {
    userTypes?: string[];
    geographicRegions?: string[];
    accountAge?: string;
    optIn?: boolean;
  };
  monitoring?: {
    errorThreshold?: number;
    latencyThreshold?: number;
    violationThreshold?: number;
  };
}

export interface UserContext {
  userId?: string;
  userType?: string;
  geographicRegion?: string;
  accountAge?: number;
  optedIn?: boolean;
}

class SecurityFeatureFlagService {
  private flags: SecurityFeatureFlags;
  private rolloutConfig: Map<keyof SecurityFeatureFlags, FeatureFlagConfig>;
  private subscribers: Map<string, (flag: keyof SecurityFeatureFlags, value: boolean) => void>;

  constructor() {
    this.flags = this.getDefaultFlags();
    this.rolloutConfig = new Map();
    this.subscribers = new Map();
    this.loadConfiguration();
    this.setupRealTimeUpdates();
  }

  private getDefaultFlags(): SecurityFeatureFlags {
    return {
      // Core features - start disabled for gradual rollout
      enhanced_sanitization: false,
      strict_xss_protection: false,
      advanced_content_filtering: false,
      
      // Performance features - can be enabled more aggressively
      sanitization_caching: true,
      lazy_sanitization: false,
      batch_processing: false,
      worker_sanitization: false,
      
      // Monitoring features - safe to enable
      detailed_security_logging: true,
      real_time_violation_alerts: true,
      performance_monitoring: true,
      security_event_tracking: true,
      
      // UX features - gradual rollout
      security_status_indicators: false,
      content_formatting_help: true,
      violation_feedback: false,
      safe_content_preview: false,
      
      // Emergency controls - disabled by default
      emergency_strict_mode: false,
      block_all_html: false,
      rate_limiting_strict: false,
      suspicious_content_block: false,
    };
  }

  private async loadConfiguration(): Promise<void> {
    try {
      // Load from Firebase Remote Config or similar service
      const config = await this.fetchRemoteConfig();
      this.flags = { ...this.flags, ...config.flags };
      
      // Load rollout configurations
      for (const rolloutConfig of config.rollouts || []) {
        this.rolloutConfig.set(rolloutConfig.flag, rolloutConfig);
      }
    } catch (error) {
      console.warn('Failed to load feature flag configuration, using defaults:', error);
    }
  }

  private async fetchRemoteConfig(): Promise<{ flags: Partial<SecurityFeatureFlags>, rollouts: FeatureFlagConfig[] }> {
    // In a real implementation, this would fetch from Firebase Remote Config
    // For now, return default configuration
    return {
      flags: {},
      rollouts: [
        {
          flag: 'enhanced_sanitization',
          enabled: true,
          rolloutPercentage: 10,
          userCriteria: {
            userTypes: ['premium', 'beta'],
            optIn: true
          },
          monitoring: {
            errorThreshold: 0.1,
            latencyThreshold: 200,
            violationThreshold: 10
          }
        },
        {
          flag: 'strict_xss_protection',
          enabled: true,
          rolloutPercentage: 5,
          userCriteria: {
            userTypes: ['internal', 'beta']
          },
          monitoring: {
            errorThreshold: 0.05,
            latencyThreshold: 150
          }
        }
      ]
    };
  }

  public isEnabled(flag: keyof SecurityFeatureFlags, userContext?: UserContext): boolean {
    // Check for emergency overrides first
    if (this.hasEmergencyOverride(flag)) {
      return this.getEmergencyOverride(flag);
    }

    // Check user-specific overrides
    if (userContext?.userId && this.hasUserOverride(flag, userContext.userId)) {
      return this.getUserOverride(flag, userContext.userId);
    }

    // Check rollout configuration
    const rolloutConfig = this.rolloutConfig.get(flag);
    if (rolloutConfig && rolloutConfig.enabled) {
      // Check user criteria
      if (!this.meetsUserCriteria(rolloutConfig, userContext)) {
        return false;
      }

      // Check percentage rollout
      if (rolloutConfig.rolloutPercentage !== undefined) {
        return this.isUserInRollout(flag, userContext?.userId, rolloutConfig.rolloutPercentage);
      }
    }

    // Return global flag value
    return this.flags[flag];
  }

  private meetsUserCriteria(config: FeatureFlagConfig, userContext?: UserContext): boolean {
    if (!config.userCriteria || !userContext) {
      return true;
    }

    const criteria = config.userCriteria;

    // Check user type
    if (criteria.userTypes && userContext.userType) {
      if (!criteria.userTypes.includes(userContext.userType)) {
        return false;
      }
    }

    // Check geographic region
    if (criteria.geographicRegions && userContext.geographicRegion) {
      if (!criteria.geographicRegions.includes(userContext.geographicRegion)) {
        return false;
      }
    }

    // Check account age
    if (criteria.accountAge && userContext.accountAge !== undefined) {
      const requiredAge = this.parseAccountAge(criteria.accountAge);
      if (userContext.accountAge < requiredAge) {
        return false;
      }
    }

    // Check opt-in status
    if (criteria.optIn && !userContext.optedIn) {
      return false;
    }

    return true;
  }

  private parseAccountAge(ageString: string): number {
    // Parse strings like ">30days", ">1week", etc.
    const match = ageString.match(/^>(\d+)(days?|weeks?|months?)$/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'day':
      case 'days':
        return value;
      case 'week':
      case 'weeks':
        return value * 7;
      case 'month':
      case 'months':
        return value * 30;
      default:
        return 0;
    }
  }

  private isUserInRollout(flag: keyof SecurityFeatureFlags, userId?: string, percentage: number): boolean {
    if (!userId) {
      // For anonymous users, use random rollout
      return Math.random() * 100 < percentage;
    }

    // Use consistent hash-based rollout for logged-in users
    const hash = this.hashUserId(userId + flag);
    return (hash % 100) < percentage;
  }

  private hashUserId(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  public async updateFlag(flag: keyof SecurityFeatureFlags, value: boolean): Promise<void> {
    this.flags[flag] = value;
    await this.persistFlags();
    this.notifySubscribers(flag, value);
  }

  public async setRolloutPercentage(flag: keyof SecurityFeatureFlags, percentage: number): Promise<void> {
    const config = this.rolloutConfig.get(flag) || { flag, enabled: true };
    config.rolloutPercentage = percentage;
    this.rolloutConfig.set(flag, config);
    
    await this.persistRolloutConfig();
    this.notifySubscribers(flag, percentage);
  }

  public async enableEmergencyMode(): Promise<void> {
    const emergencyFlags: Partial<SecurityFeatureFlags> = {
      emergency_strict_mode: true,
      strict_xss_protection: true,
      detailed_security_logging: true,
      real_time_violation_alerts: true,
      rate_limiting_strict: true,
      suspicious_content_block: true
    };

    for (const [flag, value] of Object.entries(emergencyFlags)) {
      await this.updateFlag(flag as keyof SecurityFeatureFlags, value as boolean);
    }

    console.log('Emergency security mode activated');
  }

  public async disableEmergencyMode(): Promise<void> {
    const emergencyFlags: Partial<SecurityFeatureFlags> = {
      emergency_strict_mode: false,
      rate_limiting_strict: false,
      suspicious_content_block: false
    };

    for (const [flag, value] of Object.entries(emergencyFlags)) {
      await this.updateFlag(flag as keyof SecurityFeatureFlags, value as boolean);
    }

    console.log('Emergency security mode deactivated');
  }

  public subscribe(id: string, callback: (flag: keyof SecurityFeatureFlags, value: boolean | number) => void): void {
    this.subscribers.set(id, callback);
  }

  public unsubscribe(id: string): void {
    this.subscribers.delete(id);
  }

  private notifySubscribers(flag: keyof SecurityFeatureFlags, value: boolean | number): void {
    for (const callback of this.subscribers.values()) {
      try {
        callback(flag, value);
      } catch (error) {
        console.error('Error notifying feature flag subscriber:', error);
      }
    }
  }

  private async persistFlags(): Promise<void> {
    try {
      // In a real implementation, this would persist to Firebase Remote Config
      localStorage.setItem('security-feature-flags', JSON.stringify(this.flags));
    } catch (error) {
      console.error('Failed to persist feature flags:', error);
    }
  }

  private async persistRolloutConfig(): Promise<void> {
    try {
      const config = Array.from(this.rolloutConfig.entries()).map(([flag, config]) => ({
        flag,
        ...config
      }));
      localStorage.setItem('security-rollout-config', JSON.stringify(config));
    } catch (error) {
      console.error('Failed to persist rollout configuration:', error);
    }
  }

  private setupRealTimeUpdates(): void {
    // In a real implementation, this would listen to Firebase Remote Config updates
    // For now, we'll simulate with periodic checks
    setInterval(() => {
      this.loadConfiguration();
    }, 60000); // Check every minute
  }

  private hasEmergencyOverride(flag: keyof SecurityFeatureFlags): boolean {
    // Check for emergency overrides in localStorage or remote config
    const overrides = this.getEmergencyOverrides();
    return flag in overrides;
  }

  private getEmergencyOverride(flag: keyof SecurityFeatureFlags): boolean {
    const overrides = this.getEmergencyOverrides();
    return overrides[flag] || false;
  }

  private getEmergencyOverrides(): Partial<SecurityFeatureFlags> {
    try {
      const stored = localStorage.getItem('emergency-security-overrides');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private hasUserOverride(flag: keyof SecurityFeatureFlags, userId: string): boolean {
    // Check for user-specific overrides
    const overrides = this.getUserOverrides(userId);
    return flag in overrides;
  }

  private getUserOverride(flag: keyof SecurityFeatureFlags, userId: string): boolean {
    const overrides = this.getUserOverrides(userId);
    return overrides[flag] || false;
  }

  private getUserOverrides(userId: string): Partial<SecurityFeatureFlags> {
    try {
      const stored = localStorage.getItem(`user-security-overrides-${userId}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  // Monitoring and metrics
  public getMetrics(): {
    flagStates: SecurityFeatureFlags;
    rolloutPercentages: Record<string, number>;
    activeUsers: number;
  } {
    const rolloutPercentages: Record<string, number> = {};
    for (const [flag, config] of this.rolloutConfig.entries()) {
      if (config.rolloutPercentage !== undefined) {
        rolloutPercentages[flag] = config.rolloutPercentage;
      }
    }

    return {
      flagStates: { ...this.flags },
      rolloutPercentages,
      activeUsers: this.getActiveUserCount()
    };
  }

  private getActiveUserCount(): number {
    // In a real implementation, this would query active user metrics
    return 0;
  }
}

// Singleton instance
export const securityFeatureFlags = new SecurityFeatureFlagService();

// React hook for feature flags
export function useSecurityFeatureFlag(flag: keyof SecurityFeatureFlags, userContext?: UserContext): boolean {
  const [isEnabled, setIsEnabled] = useState(() => 
    securityFeatureFlags.isEnabled(flag, userContext)
  );

  useEffect(() => {
    const subscriptionId = `react-hook-${flag}-${Math.random()}`;
    
    securityFeatureFlags.subscribe(subscriptionId, (updatedFlag, value) => {
      if (updatedFlag === flag) {
        setIsEnabled(securityFeatureFlags.isEnabled(flag, userContext));
      }
    });

    return () => {
      securityFeatureFlags.unsubscribe(subscriptionId);
    };
  }, [flag, userContext]);

  return isEnabled;
}

// Utility functions for common patterns
export function withSecurityFeatureFlag<T>(
  flag: keyof SecurityFeatureFlags,
  component: React.ComponentType<T>,
  fallback?: React.ComponentType<T>
): React.ComponentType<T> {
  return (props: T) => {
    const isEnabled = useSecurityFeatureFlag(flag);
    
    if (isEnabled) {
      return React.createElement(component, props);
    }
    
    if (fallback) {
      return React.createElement(fallback, props);
    }
    
    return null;
  };
}

export default securityFeatureFlags;