interface ApiCost {
  id: string;
  service: 'replicate' | 'runwayml' | 'openai' | 'custom';
  operation: string;
  cost: number;
  currency: 'USD';
  timestamp: number;
  userId?: string;
  metadata?: Record<string, any>;
}

interface CostSummary {
  total: number;
  byService: Record<string, number>;
  byOperation: Record<string, number>;
  byUser: Record<string, number>;
  byTimeRange: Array<{
    date: string;
    cost: number;
    breakdown: Record<string, number>;
  }>;
}

interface CostAlert {
  id: string;
  type: 'threshold' | 'spike' | 'budget';
  service?: string;
  threshold: number;
  currentValue: number;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  acknowledged: boolean;
}

interface BudgetConfig {
  service?: string;
  operation?: string;
  period: 'daily' | 'weekly' | 'monthly';
  limit: number;
  alertThresholds: number[]; // e.g., [0.5, 0.8, 0.9] for 50%, 80%, 90%
}

class CostTrackingService {
  private costs: ApiCost[] = [];
  private alerts: CostAlert[] = [];
  private budgets: BudgetConfig[] = [];
  private isEnabled: boolean = true;

  // Service pricing configurations
  private readonly PRICING = {
    replicate: {
      'stable-diffusion': { baseRate: 0.0023, unit: 'per_prediction' },
      'llama-2': { baseRate: 0.0013, unit: 'per_prediction' },
      'whisper': { baseRate: 0.0001, unit: 'per_second' }
    },
    runwayml: {
      'gen-2': { baseRate: 0.05, unit: 'per_second' },
      'gen-1': { baseRate: 0.03, unit: 'per_second' }
    },
    openai: {
      'gpt-4': { baseRate: 0.03, unit: 'per_1k_tokens' },
      'gpt-3.5-turbo': { baseRate: 0.002, unit: 'per_1k_tokens' },
      'dall-e-3': { baseRate: 0.04, unit: 'per_image' }
    }
  };

  constructor() {
    this.loadPersistedData();
    this.setupDefaultBudgets();
    this.startPeriodicChecks();
  }

  // Track API cost
  trackCost(
    service: ApiCost['service'],
    operation: string,
    cost: number,
    userId?: string,
    metadata?: Record<string, any>
  ): string {
    if (!this.isEnabled) return '';

    const costEntry: ApiCost = {
      id: this.generateId(),
      service,
      operation,
      cost,
      currency: 'USD',
      timestamp: Date.now(),
      userId,
      metadata
    };

    this.costs.push(costEntry);
    this.persistData();

    // Check for alerts
    this.checkAlerts(costEntry);

    // Send to analytics
    this.sendToAnalytics(costEntry);

    return costEntry.id;
  }

  // Calculate cost for Replicate API
  calculateReplicateCost(
    model: string,
    usage: { predictions?: number; seconds?: number; tokens?: number }
  ): number {
    const pricing = this.PRICING.replicate[model as keyof typeof this.PRICING.replicate];
    if (!pricing) return 0;

    switch (pricing.unit) {
      case 'per_prediction':
        return (usage.predictions || 0) * pricing.baseRate;
      case 'per_second':
        return (usage.seconds || 0) * pricing.baseRate;
      case 'per_1k_tokens':
        return ((usage.tokens || 0) / 1000) * pricing.baseRate;
      default:
        return 0;
    }
  }

  // Calculate cost for RunwayML API
  calculateRunwayMLCost(model: string, seconds: number): number {
    const pricing = this.PRICING.runwayml[model as keyof typeof this.PRICING.runwayml];
    if (!pricing) return 0;

    return seconds * pricing.baseRate;
  }

  // Calculate cost for OpenAI API
  calculateOpenAICost(
    model: string,
    usage: { tokens?: number; images?: number }
  ): number {
    const pricing = this.PRICING.openai[model as keyof typeof this.PRICING.openai];
    if (!pricing) return 0;

    switch (pricing.unit) {
      case 'per_1k_tokens':
        return ((usage.tokens || 0) / 1000) * pricing.baseRate;
      case 'per_image':
        return (usage.images || 0) * pricing.baseRate;
      default:
        return 0;
    }
  }

  // Get cost summary
  getCostSummary(timeRange?: { start: number; end: number }): CostSummary {
    let filteredCosts = this.costs;

    if (timeRange) {
      filteredCosts = this.costs.filter(cost => 
        cost.timestamp >= timeRange.start && cost.timestamp <= timeRange.end
      );
    }

    const total = filteredCosts.reduce((sum, cost) => sum + cost.cost, 0);

    const byService = filteredCosts.reduce((acc, cost) => {
      acc[cost.service] = (acc[cost.service] || 0) + cost.cost;
      return acc;
    }, {} as Record<string, number>);

    const byOperation = filteredCosts.reduce((acc, cost) => {
      acc[cost.operation] = (acc[cost.operation] || 0) + cost.cost;
      return acc;
    }, {} as Record<string, number>);

    const byUser = filteredCosts.reduce((acc, cost) => {
      if (cost.userId) {
        acc[cost.userId] = (acc[cost.userId] || 0) + cost.cost;
      }
      return acc;
    }, {} as Record<string, number>);

    // Group by day for time series
    const byTimeRange = this.groupCostsByDay(filteredCosts);

    return {
      total,
      byService,
      byOperation,
      byUser,
      byTimeRange
    };
  }

  // Get costs for specific service
  getServiceCosts(service: ApiCost['service'], timeRange?: { start: number; end: number }): ApiCost[] {
    let costs = this.costs.filter(cost => cost.service === service);

    if (timeRange) {
      costs = costs.filter(cost => 
        cost.timestamp >= timeRange.start && cost.timestamp <= timeRange.end
      );
    }

    return costs.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Get costs for specific user
  getUserCosts(userId: string, timeRange?: { start: number; end: number }): ApiCost[] {
    let costs = this.costs.filter(cost => cost.userId === userId);

    if (timeRange) {
      costs = costs.filter(cost => 
        cost.timestamp >= timeRange.start && cost.timestamp <= timeRange.end
      );
    }

    return costs.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Set up budget alerts
  setBudget(config: BudgetConfig): void {
    const existingIndex = this.budgets.findIndex(budget => 
      budget.service === config.service && 
      budget.operation === config.operation &&
      budget.period === config.period
    );

    if (existingIndex >= 0) {
      this.budgets[existingIndex] = config;
    } else {
      this.budgets.push(config);
    }

    this.persistData();
  }

  // Get active alerts
  getAlerts(acknowledged = false): CostAlert[] {
    return this.alerts
      .filter(alert => alert.acknowledged === acknowledged)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // Acknowledge alert
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.persistData();
      return true;
    }
    return false;
  }

  // Get budget status
  getBudgetStatus(): Array<{
    config: BudgetConfig;
    currentSpend: number;
    percentUsed: number;
    status: 'ok' | 'warning' | 'critical' | 'exceeded';
  }> {
    return this.budgets.map(budget => {
      const timeRange = this.getBudgetTimeRange(budget.period);
      const costs = this.costs.filter(cost => {
        const matchesService = !budget.service || cost.service === budget.service;
        const matchesOperation = !budget.operation || cost.operation === budget.operation;
        const inTimeRange = cost.timestamp >= timeRange.start && cost.timestamp <= timeRange.end;
        
        return matchesService && matchesOperation && inTimeRange;
      });

      const currentSpend = costs.reduce((sum, cost) => sum + cost.cost, 0);
      const percentUsed = (currentSpend / budget.limit) * 100;

      let status: 'ok' | 'warning' | 'critical' | 'exceeded' = 'ok';
      if (percentUsed >= 100) {
        status = 'exceeded';
      } else if (percentUsed >= (budget.alertThresholds[2] || 90) * 100) {
        status = 'critical';
      } else if (percentUsed >= (budget.alertThresholds[1] || 80) * 100) {
        status = 'warning';
      }

      return {
        config: budget,
        currentSpend,
        percentUsed,
        status
      };
    });
  }

  // Export cost data
  exportCosts(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['ID', 'Service', 'Operation', 'Cost', 'Currency', 'Timestamp', 'User ID'];
      const rows = this.costs.map(cost => [
        cost.id,
        cost.service,
        cost.operation,
        cost.cost.toString(),
        cost.currency,
        new Date(cost.timestamp).toISOString(),
        cost.userId || ''
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(this.costs, null, 2);
  }

  // Clear cost data
  clearCosts(olderThan?: number): void {
    if (olderThan) {
      this.costs = this.costs.filter(cost => cost.timestamp > olderThan);
    } else {
      this.costs = [];
    }
    
    this.persistData();
  }

  // Enable/disable cost tracking
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  // Private methods
  private generateId(): string {
    return `cost_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private persistData(): void {
    try {
      const data = {
        costs: this.costs.slice(-10000), // Keep last 10k entries
        alerts: this.alerts.slice(-1000), // Keep last 1k alerts
        budgets: this.budgets
      };
      localStorage.setItem('cost_tracking_data', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to persist cost tracking data:', error);
    }
  }

  private loadPersistedData(): void {
    try {
      const stored = localStorage.getItem('cost_tracking_data');
      if (stored) {
        const data = JSON.parse(stored);
        this.costs = data.costs || [];
        this.alerts = data.alerts || [];
        this.budgets = data.budgets || [];
      }
    } catch (error) {
      console.warn('Failed to load persisted cost tracking data:', error);
    }
  }

  private setupDefaultBudgets(): void {
    if (this.budgets.length === 0) {
      // Set up default budgets
      this.budgets = [
        {
          period: 'daily',
          limit: 50,
          alertThresholds: [0.5, 0.8, 0.9]
        },
        {
          period: 'monthly',
          limit: 1000,
          alertThresholds: [0.7, 0.85, 0.95]
        },
        {
          service: 'replicate',
          period: 'daily',
          limit: 30,
          alertThresholds: [0.6, 0.8, 0.9]
        },
        {
          service: 'runwayml',
          period: 'daily',
          limit: 20,
          alertThresholds: [0.6, 0.8, 0.9]
        }
      ];
    }
  }

  private checkAlerts(newCost: ApiCost): void {
    // Check for cost spikes
    this.checkCostSpike(newCost);
    
    // Check budget thresholds
    this.checkBudgetThresholds();
    
    // Check service-specific thresholds
    this.checkServiceThresholds(newCost);
  }

  private checkCostSpike(newCost: ApiCost): void {
    // Get recent costs for the same service/operation
    const recentCosts = this.costs
      .filter(cost => 
        cost.service === newCost.service &&
        cost.operation === newCost.operation &&
        cost.timestamp > Date.now() - 24 * 60 * 60 * 1000 // Last 24 hours
      )
      .slice(-10); // Last 10 operations

    if (recentCosts.length < 3) return;

    const averageCost = recentCosts.reduce((sum, cost) => sum + cost.cost, 0) / recentCosts.length;
    const spikeThreshold = averageCost * 3; // 3x average

    if (newCost.cost > spikeThreshold) {
      this.createAlert({
        type: 'spike',
        service: newCost.service,
        threshold: spikeThreshold,
        currentValue: newCost.cost,
        message: `Cost spike detected for ${newCost.service}/${newCost.operation}: $${newCost.cost.toFixed(4)} (3x average: $${averageCost.toFixed(4)})`,
        severity: 'high'
      });
    }
  }

  private checkBudgetThresholds(): void {
    const budgetStatuses = this.getBudgetStatus();
    
    budgetStatuses.forEach(({ config, currentSpend, percentUsed, status }) => {
      config.alertThresholds.forEach((threshold, index) => {
        const thresholdPercent = threshold * 100;
        
        if (percentUsed >= thresholdPercent) {
          const severity = index === 0 ? 'low' : index === 1 ? 'medium' : 'high';
          const budgetName = config.service ? `${config.service} ${config.period}` : `Total ${config.period}`;
          
          this.createAlert({
            type: 'budget',
            service: config.service,
            threshold: config.limit * threshold,
            currentValue: currentSpend,
            message: `${budgetName} budget ${thresholdPercent}% used: $${currentSpend.toFixed(2)} of $${config.limit}`,
            severity
          });
        }
      });
    });
  }

  private checkServiceThresholds(newCost: ApiCost): void {
    // Check if service costs are unusually high for the day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCosts = this.costs.filter(cost => 
      cost.service === newCost.service &&
      cost.timestamp >= today.getTime()
    );

    const totalToday = todayCosts.reduce((sum, cost) => sum + cost.cost, 0);
    
    // Service-specific daily thresholds
    const serviceThresholds = {
      replicate: 25,
      runwayml: 15,
      openai: 10,
      custom: 5
    };

    const threshold = serviceThresholds[newCost.service] || 5;
    
    if (totalToday > threshold) {
      this.createAlert({
        type: 'threshold',
        service: newCost.service,
        threshold,
        currentValue: totalToday,
        message: `Daily ${newCost.service} costs exceeded threshold: $${totalToday.toFixed(2)} > $${threshold}`,
        severity: 'medium'
      });
    }
  }

  private createAlert(alertData: Omit<CostAlert, 'id' | 'timestamp' | 'acknowledged'>): void {
    // Check if similar alert already exists (avoid spam)
    const existingAlert = this.alerts.find(alert => 
      alert.type === alertData.type &&
      alert.service === alertData.service &&
      alert.timestamp > Date.now() - 60 * 60 * 1000 && // Within last hour
      !alert.acknowledged
    );

    if (existingAlert) return;

    const alert: CostAlert = {
      id: this.generateId(),
      timestamp: Date.now(),
      acknowledged: false,
      ...alertData
    };

    this.alerts.push(alert);
    this.persistData();

    // Send notification
    this.sendAlertNotification(alert);
  }

  private sendAlertNotification(alert: CostAlert): void {
    // Send to analytics service
    if (typeof window !== 'undefined' && (window as any).analyticsService) {
      (window as any).analyticsService.track('cost_alert', {
        type: alert.type,
        service: alert.service,
        severity: alert.severity,
        threshold: alert.threshold,
        currentValue: alert.currentValue
      });
    }

    // Send to external notification services
    this.sendSlackNotification(alert);
    this.sendEmailNotification(alert);
  }

  private async sendSlackNotification(alert: CostAlert): Promise<void> {
    if (!process.env.SLACK_WEBHOOK_URL) return;

    const color = {
      low: '#36a64f',
      medium: '#ff9500',
      high: '#ff0000',
      critical: '#8b0000'
    }[alert.severity];

    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attachments: [{
            color,
            title: `Cost Alert: ${alert.severity.toUpperCase()}`,
            text: alert.message,
            fields: [
              { title: 'Service', value: alert.service || 'All', short: true },
              { title: 'Type', value: alert.type, short: true },
              { title: 'Threshold', value: `$${alert.threshold.toFixed(2)}`, short: true },
              { title: 'Current', value: `$${alert.currentValue.toFixed(2)}`, short: true }
            ],
            timestamp: Math.floor(alert.timestamp / 1000)
          }]
        })
      });
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }
  }

  private async sendEmailNotification(alert: CostAlert): Promise<void> {
    // Implementation would depend on your email service
    console.log('Email notification would be sent:', alert);
  }

  private sendToAnalytics(cost: ApiCost): void {
    if (typeof window !== 'undefined' && (window as any).analyticsService) {
      (window as any).analyticsService.trackApiCost(cost.service, cost.cost, {
        operation: cost.operation,
        userId: cost.userId,
        metadata: cost.metadata
      });
    }
  }

  private groupCostsByDay(costs: ApiCost[]): Array<{
    date: string;
    cost: number;
    breakdown: Record<string, number>;
  }> {
    const grouped = costs.reduce((acc, cost) => {
      const date = new Date(cost.timestamp).toISOString().split('T')[0];
      
      if (!acc[date]) {
        acc[date] = { total: 0, breakdown: {} };
      }
      
      acc[date].total += cost.cost;
      acc[date].breakdown[cost.service] = (acc[date].breakdown[cost.service] || 0) + cost.cost;
      
      return acc;
    }, {} as Record<string, { total: number; breakdown: Record<string, number> }>);

    return Object.entries(grouped)
      .map(([date, data]) => ({
        date,
        cost: data.total,
        breakdown: data.breakdown
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private getBudgetTimeRange(period: BudgetConfig['period']): { start: number; end: number } {
    const now = new Date();
    const end = now.getTime();
    let start: number;

    switch (period) {
      case 'daily':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        start = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000).getTime();
        break;
      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        break;
      default:
        start = end - 24 * 60 * 60 * 1000; // Default to daily
    }

    return { start, end };
  }

  private startPeriodicChecks(): void {
    // Check budgets every hour
    setInterval(() => {
      this.checkBudgetThresholds();
    }, 60 * 60 * 1000);

    // Clean up old alerts daily
    setInterval(() => {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      this.alerts = this.alerts.filter(alert => alert.timestamp > oneWeekAgo);
      this.persistData();
    }, 24 * 60 * 60 * 1000);
  }
}

// Export singleton instance
export const costTrackingService = new CostTrackingService();
export default costTrackingService;