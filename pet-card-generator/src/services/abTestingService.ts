interface ABTestVariant {
  id: string;
  name: string;
  weight: number; // Percentage allocation (0-100)
  config: Record<string, any>;
  isControl?: boolean;
}

interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate: string;
  endDate?: string;
  targetAudience?: {
    userType?: ('free' | 'premium' | 'trial')[];
    deviceType?: ('desktop' | 'mobile' | 'tablet')[];
    location?: string[];
    newUsers?: boolean;
    returningUsers?: boolean;
  };
  variants: ABTestVariant[];
  metrics: {
    primary: string;
    secondary?: string[];
  };
  sampleSize?: number;
  confidenceLevel?: number;
}

interface ABTestAssignment {
  testId: string;
  variantId: string;
  userId: string;
  assignedAt: number;
  exposureLogged: boolean;
}

interface ABTestResult {
  testId: string;
  variantId: string;
  metric: string;
  value: number;
  timestamp: number;
  userId: string;
}

class ABTestingService {
  private assignments: Map<string, ABTestAssignment> = new Map();
  private tests: Map<string, ABTest> = new Map();
  private userId: string | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  // Initialize A/B testing service
  private async initialize(): Promise<void> {
    try {
      // Load user assignments from storage
      this.loadAssignments();
      
      // Load active tests
      await this.loadActiveTests();
      
      // Set up user identification
      this.identifyUser();
      
      this.isInitialized = true;
      console.log('A/B Testing service initialized');
    } catch (error) {
      console.error('Failed to initialize A/B testing service:', error);
    }
  }

  // Set user ID
  setUser(userId: string): void {
    this.userId = userId;
    
    // Reassign tests for the new user
    this.assignUserToTests();
  }

  // Get variant for a test
  getVariant(testId: string): string | null {
    const assignment = this.assignments.get(testId);
    
    if (!assignment) {
      // Assign user to test if not already assigned
      const variant = this.assignUserToTest(testId);
      return variant;
    }
    
    // Log exposure if not already logged
    if (!assignment.exposureLogged) {
      this.logExposure(testId, assignment.variantId);
      assignment.exposureLogged = true;
      this.saveAssignments();
    }
    
    return assignment.variantId;
  }

  // Check if user is in a specific variant
  isInVariant(testId: string, variantId: string): boolean {
    const userVariant = this.getVariant(testId);
    return userVariant === variantId;
  }

  // Get configuration for a test variant
  getVariantConfig(testId: string): Record<string, any> {
    const variantId = this.getVariant(testId);
    if (!variantId) return {};
    
    const test = this.tests.get(testId);
    if (!test) return {};
    
    const variant = test.variants.find(v => v.id === variantId);
    return variant?.config || {};
  }

  // Track conversion for A/B test
  trackConversion(testId: string, metric: string, value: number = 1): void {
    const assignment = this.assignments.get(testId);
    if (!assignment || !this.userId) return;
    
    const result: ABTestResult = {
      testId,
      variantId: assignment.variantId,
      metric,
      value,
      timestamp: Date.now(),
      userId: this.userId
    };
    
    this.sendResult(result);
    
    // Also track in analytics
    if (typeof window !== 'undefined' && (window as any).analyticsService) {
      (window as any).analyticsService.trackEvent({
        name: 'ab_test_conversion',
        parameters: {
          test_id: testId,
          variant_id: assignment.variantId,
          metric,
          value
        }
      });
    }
  }

  // Create a new A/B test
  createTest(test: Omit<ABTest, 'status'>): void {
    const newTest: ABTest = {
      ...test,
      status: 'draft'
    };
    
    // Validate test configuration
    this.validateTest(newTest);
    
    this.tests.set(test.id, newTest);
    this.saveTests();
  }

  // Start an A/B test
  startTest(testId: string): void {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }
    
    test.status = 'running';
    test.startDate = new Date().toISOString();
    
    this.tests.set(testId, test);
    this.saveTests();
    
    // Assign current user to test if applicable
    if (this.userId) {
      this.assignUserToTest(testId);
    }
  }

  // Stop an A/B test
  stopTest(testId: string): void {
    const test = this.tests.get(testId);
    if (!test) return;
    
    test.status = 'completed';
    test.endDate = new Date().toISOString();
    
    this.tests.set(testId, test);
    this.saveTests();
  }

  // Get all active tests
  getActiveTests(): ABTest[] {
    return Array.from(this.tests.values()).filter(test => test.status === 'running');
  }

  // Get test results summary
  getTestResults(testId: string): Promise<any> {
    // This would typically fetch from analytics backend
    return this.fetchTestResults(testId);
  }

  // Assign user to a specific test
  private assignUserToTest(testId: string): string | null {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running' || !this.userId) {
      return null;
    }
    
    // Check if user matches target audience
    if (!this.matchesTargetAudience(test)) {
      return null;
    }
    
    // Use deterministic assignment based on user ID and test ID
    const hash = this.hashString(`${this.userId}_${testId}`);
    const bucket = hash % 100;
    
    let cumulativeWeight = 0;
    for (const variant of test.variants) {
      cumulativeWeight += variant.weight;
      if (bucket < cumulativeWeight) {
        const assignment: ABTestAssignment = {
          testId,
          variantId: variant.id,
          userId: this.userId,
          assignedAt: Date.now(),
          exposureLogged: false
        };
        
        this.assignments.set(testId, assignment);
        this.saveAssignments();
        
        return variant.id;
      }
    }
    
    return null;
  }

  // Assign user to all active tests
  private assignUserToTests(): void {
    const activeTests = this.getActiveTests();
    
    for (const test of activeTests) {
      if (!this.assignments.has(test.id)) {
        this.assignUserToTest(test.id);
      }
    }
  }

  // Check if user matches target audience
  private matchesTargetAudience(test: ABTest): boolean {
    if (!test.targetAudience) return true;
    
    const userProperties = this.getUserProperties();
    const audience = test.targetAudience;
    
    // Check user type
    if (audience.userType && !audience.userType.includes(userProperties.userType)) {
      return false;
    }
    
    // Check device type
    if (audience.deviceType && !audience.deviceType.includes(userProperties.deviceType)) {
      return false;
    }
    
    // Check location
    if (audience.location && userProperties.location) {
      const userCountry = userProperties.location.country;
      if (userCountry && !audience.location.includes(userCountry)) {
        return false;
      }
    }
    
    // Check new vs returning users
    if (audience.newUsers === true && userProperties.isReturningUser) {
      return false;
    }

    if (audience.returningUsers === true && !userProperties.isReturningUser) {
      return false;
    }
    
    return true;
  }

  // Log exposure event
  private logExposure(testId: string, variantId: string): void {
    if (typeof window !== 'undefined' && (window as any).analyticsService) {
      (window as any).analyticsService.trackEvent({
        name: 'ab_test_exposure',
        parameters: {
          test_id: testId,
          variant_id: variantId
        }
      });
    }
    
    // Send to A/B testing backend
    this.sendExposure(testId, variantId);
  }

  // Send exposure event to backend
  private async sendExposure(testId: string, variantId: string): Promise<void> {
    try {
      const endpoint = process.env.REACT_APP_AB_TESTING_ENDPOINT;
      if (!endpoint) return;
      
      await fetch(`${endpoint}/exposure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testId,
          variantId,
          userId: this.userId,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.error('Failed to send exposure event:', error);
    }
  }

  // Send conversion result to backend
  private async sendResult(result: ABTestResult): Promise<void> {
    try {
      const endpoint = process.env.REACT_APP_AB_TESTING_ENDPOINT;
      if (!endpoint) return;
      
      await fetch(`${endpoint}/conversion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(result)
      });
    } catch (error) {
      console.error('Failed to send conversion result:', error);
    }
  }

  // Fetch test results from backend
  private async fetchTestResults(testId: string): Promise<any> {
    try {
      const endpoint = process.env.REACT_APP_AB_TESTING_ENDPOINT;
      if (!endpoint) return null;
      
      const response = await fetch(`${endpoint}/results/${testId}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch test results:', error);
      return null;
    }
  }

  // Load active tests from backend or config
  private async loadActiveTests(): Promise<void> {
    try {
      // Load from backend
      const endpoint = process.env.REACT_APP_AB_TESTING_ENDPOINT;
      if (endpoint) {
        const response = await fetch(`${endpoint}/tests/active`);
        const tests = await response.json();
        
        tests.forEach((test: ABTest) => {
          this.tests.set(test.id, test);
        });
      } else {
        // Load from local configuration
        this.loadLocalTests();
      }
    } catch (error) {
      console.error('Failed to load active tests:', error);
      // Fallback to local tests
      this.loadLocalTests();
    }
  }

  // Load tests from local configuration
  private loadLocalTests(): void {
    // Example tests - in production, these would come from a config service
    const localTests: ABTest[] = [
      {
        id: 'hero_cta_test',
        name: 'Hero CTA Button Test',
        description: 'Test different CTA button texts on the hero section',
        status: 'running',
        startDate: new Date().toISOString(),
        variants: [
          {
            id: 'control',
            name: 'Get Started',
            weight: 50,
            config: { buttonText: 'Get Started' },
            isControl: true
          },
          {
            id: 'variant_a',
            name: 'Create Your Card',
            weight: 50,
            config: { buttonText: 'Create Your Card' }
          }
        ],
        metrics: {
          primary: 'cta_click',
          secondary: ['signup', 'card_generation']
        }
      }
    ];
    
    localTests.forEach(test => {
      this.tests.set(test.id, test);
    });
  }

  // Validate test configuration
  private validateTest(test: ABTest): void {
    // Check that weights sum to 100
    const totalWeight = test.variants.reduce((sum, variant) => sum + variant.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error(`Test ${test.id}: Variant weights must sum to 100, got ${totalWeight}`);
    }
    
    // Check that there's at least one control variant
    const hasControl = test.variants.some(variant => variant.isControl);
    if (!hasControl) {
      console.warn(`Test ${test.id}: No control variant specified`);
    }
    
    // Check for duplicate variant IDs
    const variantIds = test.variants.map(v => v.id);
    const uniqueIds = new Set(variantIds);
    if (variantIds.length !== uniqueIds.size) {
      throw new Error(`Test ${test.id}: Duplicate variant IDs found`);
    }
  }

  // Get user properties for audience targeting
  private getUserProperties(): any {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const analytics = typeof window !== 'undefined' && (window as any).analyticsService?.getAnalyticsData();
      
      return {
        userType: user.subscription?.tier || 'free',
        deviceType: this.getDeviceType(),
        location: analytics?.userProperties?.location,
        isReturningUser: !!localStorage.getItem('returning_user')
      };
    } catch (error) {
      return {
        userType: 'free',
        deviceType: this.getDeviceType(),
        isReturningUser: false
      };
    }
  }

  // Get device type
  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    if (typeof window === 'undefined') return 'desktop';
    
    const userAgent = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    }
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

  // Simple hash function for deterministic assignment
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Identify user from storage
  private identifyUser(): void {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.id) {
        this.setUser(user.id);
      }
    } catch (error) {
      console.log('No user found for A/B testing');
    }
  }

  // Load assignments from storage
  private loadAssignments(): void {
    try {
      const stored = localStorage.getItem('ab_test_assignments');
      if (stored) {
        const assignments = JSON.parse(stored);
        Object.entries(assignments).forEach(([testId, assignment]) => {
          this.assignments.set(testId, assignment as ABTestAssignment);
        });
      }
    } catch (error) {
      console.error('Failed to load A/B test assignments:', error);
    }
  }

  // Save assignments to storage
  private saveAssignments(): void {
    try {
      const assignments = Object.fromEntries(this.assignments);
      localStorage.setItem('ab_test_assignments', JSON.stringify(assignments));
    } catch (error) {
      console.error('Failed to save A/B test assignments:', error);
    }
  }

  // Save tests to storage
  private saveTests(): void {
    try {
      const tests = Object.fromEntries(this.tests);
      localStorage.setItem('ab_tests', JSON.stringify(tests));
    } catch (error) {
      console.error('Failed to save A/B tests:', error);
    }
  }
}

// Export singleton instance
export const abTestingService = new ABTestingService();
export default abTestingService;