/**
 * Deployment Monitoring Service
 * Monitors security deployments and triggers alerts/rollbacks when needed
 */

import { securityEventIntegration } from './securityEventIntegration';
import { securityFeatureFlags } from '../config/feature-flags';
import * as Sentry from '@sentry/react';

export interface DeploymentMetrics {
  // Performance metrics
  sanitization_latency_p50: number;
  sanitization_latency_p95: number;
  sanitization_latency_p99: number;
  throughput_requests_per_second: number;
  
  // Error metrics
  error_rate_percentage: number;
  timeout_rate_percentage: number;
  sanitization_failure_rate: number;
  
  // Security metrics
  security_violations_per_minute: number;
  blocked_attacks_per_minute: number;
  false_positive_rate: number;
  
  // User experience metrics
  user_satisfaction_score: number;
  support_ticket_rate: number;
  feature_adoption_rate: number;
}

export interface AlertThresholds {
  // Critical thresholds (immediate rollback)
  critical_error_rate: number;
  critical_violation_rate: number;
  critical_latency_p95: number;
  critical_failure_rate: number;
  
  // Warning thresholds (monitor closely)
  warning_error_rate: number;
  warning_violation_rate: number;
  warning_latency_p95: number;
  warning_satisfaction_drop: number;
}

export interface DeploymentAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  message: string;
  metrics: Partial<DeploymentMetrics>;
  timestamp: Date;
  deploymentId: string;
  autoActionTaken?: string;
}

class DeploymentMonitoringService {
  private isMonitoring: boolean = false;
  private currentDeploymentId: string | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private baselineMetrics: DeploymentMetrics | null = null;
  private alertHistory: DeploymentAlert[] = [];

  private readonly defaultThresholds: AlertThresholds = {
    // Critical thresholds
    critical_error_rate: 1.0,        // 1% error rate
    critical_violation_rate: 50,     // 50 violations per minute
    critical_latency_p95: 1000,      // 1 second p95 latency
    critical_failure_rate: 5.0,      // 5% sanitization failure rate
    
    // Warning thresholds
    warning_error_rate: 0.5,         // 0.5% error rate
    warning_violation_rate: 20,      // 20 violations per minute
    warning_latency_p95: 500,        // 500ms p95 latency
    warning_satisfaction_drop: 0.2   // 20% satisfaction drop
  };

  public async startDeploymentMonitoring(
    deploymentId: string,
    duration: number = 2 * 60 * 60 * 1000, // 2 hours default
    customThresholds?: Partial<AlertThresholds>
  ): Promise<void> {
    if (this.isMonitoring) {
      console.warn('Deployment monitoring already active');
      return;
    }

    this.currentDeploymentId = deploymentId;
    this.isMonitoring = true;
    this.alertHistory = [];

    // Capture baseline metrics
    this.baselineMetrics = await this.captureBaselineMetrics();

    const thresholds = { ...this.defaultThresholds, ...customThresholds };

    console.log(`Starting deployment monitoring for ${deploymentId} (duration: ${duration}ms)`);

    // Start monitoring loop
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkMetrics(thresholds);
      } catch (error) {
        console.error('Error during deployment monitoring:', error);
        Sentry.captureException(error);
      }
    }, 30000); // Check every 30 seconds

    // Stop monitoring after duration
    setTimeout(() => {
      this.stopDeploymentMonitoring();
    }, duration);

    // Report monitoring start
    await this.reportDeploymentEvent('monitoring_started', {
      deploymentId,
      duration,
      thresholds
    });
  }

  public async stopDeploymentMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log(`Stopping deployment monitoring for ${this.currentDeploymentId}`);

    // Generate final report
    await this.generateDeploymentReport();

    // Report monitoring end
    await this.reportDeploymentEvent('monitoring_stopped', {
      deploymentId: this.currentDeploymentId,
      alertCount: this.alertHistory.length,
      criticalAlerts: this.alertHistory.filter(a => a.severity === 'critical').length
    });

    this.currentDeploymentId = null;
    this.baselineMetrics = null;
  }

  private async checkMetrics(thresholds: AlertThresholds): Promise<void> {
    const currentMetrics = await this.getCurrentMetrics();
    
    // Check critical thresholds
    await this.checkCriticalThresholds(currentMetrics, thresholds);
    
    // Check warning thresholds
    await this.checkWarningThresholds(currentMetrics, thresholds);
    
    // Check performance degradation
    await this.checkPerformanceDegradation(currentMetrics);
    
    // Check security effectiveness
    await this.checkSecurityEffectiveness(currentMetrics);
  }

  private async checkCriticalThresholds(
    metrics: DeploymentMetrics,
    thresholds: AlertThresholds
  ): Promise<void> {
    const criticalAlerts: DeploymentAlert[] = [];

    // Error rate check
    if (metrics.error_rate_percentage > thresholds.critical_error_rate) {
      criticalAlerts.push({
        id: `error-rate-${Date.now()}`,
        severity: 'critical',
        type: 'high_error_rate',
        message: `Error rate ${metrics.error_rate_percentage}% exceeds critical threshold ${thresholds.critical_error_rate}%`,
        metrics: { error_rate_percentage: metrics.error_rate_percentage },
        timestamp: new Date(),
        deploymentId: this.currentDeploymentId!,
        autoActionTaken: 'rollback_initiated'
      });
    }

    // Security violation rate check
    if (metrics.security_violations_per_minute > thresholds.critical_violation_rate) {
      criticalAlerts.push({
        id: `violation-rate-${Date.now()}`,
        severity: 'critical',
        type: 'security_violation_spike',
        message: `Security violations ${metrics.security_violations_per_minute}/min exceeds critical threshold ${thresholds.critical_violation_rate}/min`,
        metrics: { security_violations_per_minute: metrics.security_violations_per_minute },
        timestamp: new Date(),
        deploymentId: this.currentDeploymentId!,
        autoActionTaken: 'strict_mode_enabled'
      });
    }

    // Latency check
    if (metrics.sanitization_latency_p95 > thresholds.critical_latency_p95) {
      criticalAlerts.push({
        id: `latency-${Date.now()}`,
        severity: 'critical',
        type: 'performance_degradation',
        message: `P95 latency ${metrics.sanitization_latency_p95}ms exceeds critical threshold ${thresholds.critical_latency_p95}ms`,
        metrics: { sanitization_latency_p95: metrics.sanitization_latency_p95 },
        timestamp: new Date(),
        deploymentId: this.currentDeploymentId!,
        autoActionTaken: 'caching_enabled'
      });
    }

    // Sanitization failure rate check
    if (metrics.sanitization_failure_rate > thresholds.critical_failure_rate) {
      criticalAlerts.push({
        id: `failure-rate-${Date.now()}`,
        severity: 'critical',
        type: 'sanitization_failure',
        message: `Sanitization failure rate ${metrics.sanitization_failure_rate}% exceeds critical threshold ${thresholds.critical_failure_rate}%`,
        metrics: { sanitization_failure_rate: metrics.sanitization_failure_rate },
        timestamp: new Date(),
        deploymentId: this.currentDeploymentId!,
        autoActionTaken: 'feature_disabled'
      });
    }

    // Process critical alerts
    for (const alert of criticalAlerts) {
      await this.processCriticalAlert(alert);
    }
  }

  private async checkWarningThresholds(
    metrics: DeploymentMetrics,
    thresholds: AlertThresholds
  ): Promise<void> {
    const warningAlerts: DeploymentAlert[] = [];

    // Warning error rate
    if (metrics.error_rate_percentage > thresholds.warning_error_rate) {
      warningAlerts.push({
        id: `warning-error-${Date.now()}`,
        severity: 'warning',
        type: 'elevated_error_rate',
        message: `Error rate ${metrics.error_rate_percentage}% exceeds warning threshold`,
        metrics: { error_rate_percentage: metrics.error_rate_percentage },
        timestamp: new Date(),
        deploymentId: this.currentDeploymentId!
      });
    }

    // Warning violation rate
    if (metrics.security_violations_per_minute > thresholds.warning_violation_rate) {
      warningAlerts.push({
        id: `warning-violations-${Date.now()}`,
        severity: 'warning',
        type: 'elevated_violation_rate',
        message: `Security violations ${metrics.security_violations_per_minute}/min exceeds warning threshold`,
        metrics: { security_violations_per_minute: metrics.security_violations_per_minute },
        timestamp: new Date(),
        deploymentId: this.currentDeploymentId!
      });
    }

    // Warning latency
    if (metrics.sanitization_latency_p95 > thresholds.warning_latency_p95) {
      warningAlerts.push({
        id: `warning-latency-${Date.now()}`,
        severity: 'warning',
        type: 'elevated_latency',
        message: `P95 latency ${metrics.sanitization_latency_p95}ms exceeds warning threshold`,
        metrics: { sanitization_latency_p95: metrics.sanitization_latency_p95 },
        timestamp: new Date(),
        deploymentId: this.currentDeploymentId!
      });
    }

    // Process warning alerts
    for (const alert of warningAlerts) {
      await this.processWarningAlert(alert);
    }
  }

  private async checkPerformanceDegradation(metrics: DeploymentMetrics): Promise<void> {
    if (!this.baselineMetrics) return;

    const latencyIncrease = (metrics.sanitization_latency_p95 - this.baselineMetrics.sanitization_latency_p95) / this.baselineMetrics.sanitization_latency_p95;
    const throughputDecrease = (this.baselineMetrics.throughput_requests_per_second - metrics.throughput_requests_per_second) / this.baselineMetrics.throughput_requests_per_second;

    if (latencyIncrease > 0.5) { // 50% increase
      await this.processWarningAlert({
        id: `perf-degradation-${Date.now()}`,
        severity: 'warning',
        type: 'performance_degradation',
        message: `Latency increased by ${(latencyIncrease * 100).toFixed(1)}% compared to baseline`,
        metrics: {
          sanitization_latency_p95: metrics.sanitization_latency_p95
        },
        timestamp: new Date(),
        deploymentId: this.currentDeploymentId!
      });
    }

    if (throughputDecrease > 0.3) { // 30% decrease
      await this.processWarningAlert({
        id: `throughput-drop-${Date.now()}`,
        severity: 'warning',
        type: 'throughput_degradation',
        message: `Throughput decreased by ${(throughputDecrease * 100).toFixed(1)}% compared to baseline`,
        metrics: {
          throughput_requests_per_second: metrics.throughput_requests_per_second
        },
        timestamp: new Date(),
        deploymentId: this.currentDeploymentId!
      });
    }
  }

  private async checkSecurityEffectiveness(metrics: DeploymentMetrics): Promise<void> {
    // Check if security features are working effectively
    const effectivenessRatio = metrics.blocked_attacks_per_minute / Math.max(metrics.security_violations_per_minute, 1);
    
    if (effectivenessRatio < 0.8) { // Less than 80% of attacks blocked
      await this.processWarningAlert({
        id: `security-effectiveness-${Date.now()}`,
        severity: 'warning',
        type: 'security_effectiveness_low',
        message: `Security effectiveness ratio ${(effectivenessRatio * 100).toFixed(1)}% is below expected threshold`,
        metrics: {
          blocked_attacks_per_minute: metrics.blocked_attacks_per_minute,
          security_violations_per_minute: metrics.security_violations_per_minute
        },
        timestamp: new Date(),
        deploymentId: this.currentDeploymentId!
      });
    }

    // Check false positive rate
    if (metrics.false_positive_rate > 0.1) { // More than 10% false positives
      await this.processWarningAlert({
        id: `false-positives-${Date.now()}`,
        severity: 'warning',
        type: 'high_false_positive_rate',
        message: `False positive rate ${(metrics.false_positive_rate * 100).toFixed(1)}% exceeds acceptable threshold`,
        metrics: {
          false_positive_rate: metrics.false_positive_rate
        },
        timestamp: new Date(),
        deploymentId: this.currentDeploymentId!
      });
    }
  }

  private async processCriticalAlert(alert: DeploymentAlert): Promise<void> {
    console.error(`🚨 CRITICAL DEPLOYMENT ALERT: ${alert.message}`);
    
    // Add to alert history
    this.alertHistory.push(alert);

    // Take automatic action based on alert type
    switch (alert.type) {
      case 'high_error_rate':
        await this.initiateAutomaticRollback(alert);
        break;
        
      case 'security_violation_spike':
        await this.enableStrictSecurityMode(alert);
        break;
        
      case 'performance_degradation':
        await this.enablePerformanceOptimizations(alert);
        break;
        
      case 'sanitization_failure':
        await this.disableFailingFeatures(alert);
        break;
    }

    // Send notifications
    await this.sendCriticalAlert(alert);
    
    // Report to Sentry
    Sentry.captureMessage(`Critical deployment alert: ${alert.message}`, 'error');
    Sentry.setTag('deployment_id', alert.deploymentId);
    Sentry.setTag('alert_type', alert.type);
  }

  private async processWarningAlert(alert: DeploymentAlert): Promise<void> {
    console.warn(`⚠️ DEPLOYMENT WARNING: ${alert.message}`);
    
    // Add to alert history
    this.alertHistory.push(alert);

    // Send notifications
    await this.sendWarningAlert(alert);
    
    // Report to Sentry
    Sentry.captureMessage(`Deployment warning: ${alert.message}`, 'warning');
    Sentry.setTag('deployment_id', alert.deploymentId);
    Sentry.setTag('alert_type', alert.type);
  }

  private async initiateAutomaticRollback(alert: DeploymentAlert): Promise<void> {
    console.log('Initiating automatic rollback due to critical error rate');
    
    try {
      // Disable new features via feature flags
      await securityFeatureFlags.updateFlag('enhanced_sanitization', false);
      await securityFeatureFlags.updateFlag('strict_xss_protection', false);
      await securityFeatureFlags.updateFlag('advanced_content_filtering', false);
      
      // Enable safe fallback features
      await securityFeatureFlags.updateFlag('sanitization_caching', true);
      
      alert.autoActionTaken = 'automatic_rollback_completed';
      
      console.log('Automatic rollback completed');
    } catch (error) {
      console.error('Failed to execute automatic rollback:', error);
      alert.autoActionTaken = 'automatic_rollback_failed';
    }
  }

  private async enableStrictSecurityMode(alert: DeploymentAlert): Promise<void> {
    console.log('Enabling strict security mode due to violation spike');
    
    try {
      await securityFeatureFlags.enableEmergencyMode();
      alert.autoActionTaken = 'strict_security_mode_enabled';
      
      console.log('Strict security mode enabled');
    } catch (error) {
      console.error('Failed to enable strict security mode:', error);
      alert.autoActionTaken = 'strict_security_mode_failed';
    }
  }

  private async enablePerformanceOptimizations(alert: DeploymentAlert): Promise<void> {
    console.log('Enabling performance optimizations due to latency issues');
    
    try {
      await securityFeatureFlags.updateFlag('sanitization_caching', true);
      await securityFeatureFlags.updateFlag('lazy_sanitization', true);
      await securityFeatureFlags.updateFlag('batch_processing', true);
      
      alert.autoActionTaken = 'performance_optimizations_enabled';
      
      console.log('Performance optimizations enabled');
    } catch (error) {
      console.error('Failed to enable performance optimizations:', error);
      alert.autoActionTaken = 'performance_optimizations_failed';
    }
  }

  private async disableFailingFeatures(alert: DeploymentAlert): Promise<void> {
    console.log('Disabling failing features due to sanitization failures');
    
    try {
      await securityFeatureFlags.updateFlag('enhanced_sanitization', false);
      await securityFeatureFlags.updateFlag('advanced_content_filtering', false);
      
      alert.autoActionTaken = 'failing_features_disabled';
      
      console.log('Failing features disabled');
    } catch (error) {
      console.error('Failed to disable failing features:', error);
      alert.autoActionTaken = 'feature_disable_failed';
    }
  }

  private async getCurrentMetrics(): Promise<DeploymentMetrics> {
    try {
      // In a real implementation, this would fetch from monitoring services
      // For now, we'll simulate with some basic metrics
      const response = await fetch('/api/metrics/deployment');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Failed to fetch deployment metrics:', error);
    }

    // Fallback to simulated metrics
    return this.getSimulatedMetrics();
  }

  private getSimulatedMetrics(): DeploymentMetrics {
    return {
      sanitization_latency_p50: 50 + Math.random() * 100,
      sanitization_latency_p95: 150 + Math.random() * 200,
      sanitization_latency_p99: 300 + Math.random() * 300,
      throughput_requests_per_second: 100 + Math.random() * 50,
      error_rate_percentage: Math.random() * 0.5,
      timeout_rate_percentage: Math.random() * 0.1,
      sanitization_failure_rate: Math.random() * 1.0,
      security_violations_per_minute: Math.random() * 10,
      blocked_attacks_per_minute: Math.random() * 8,
      false_positive_rate: Math.random() * 0.05,
      user_satisfaction_score: 4.0 + Math.random() * 1.0,
      support_ticket_rate: Math.random() * 5,
      feature_adoption_rate: 0.1 + Math.random() * 0.3
    };
  }

  private async captureBaselineMetrics(): Promise<DeploymentMetrics> {
    console.log('Capturing baseline metrics for deployment monitoring');
    return await this.getCurrentMetrics();
  }

  private async sendCriticalAlert(alert: DeploymentAlert): Promise<void> {
    // Send to Slack
    await this.sendSlackAlert('#security-incidents', `🚨 CRITICAL: ${alert.message}`, alert);
    
    // Send to PagerDuty
    await this.sendPagerDutyAlert('critical', alert);
    
    // Send email to security team
    await this.sendEmailAlert('security-team@company.com', 'Critical Deployment Alert', alert);
  }

  private async sendWarningAlert(alert: DeploymentAlert): Promise<void> {
    // Send to Slack
    await this.sendSlackAlert('#deployments', `⚠️ WARNING: ${alert.message}`, alert);
    
    // Send email to dev team
    await this.sendEmailAlert('dev-team@company.com', 'Deployment Warning', alert);
  }

  private async sendSlackAlert(channel: string, message: string, alert: DeploymentAlert): Promise<void> {
    try {
      // In a real implementation, this would use Slack API
      console.log(`Slack alert to ${channel}: ${message}`);
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  private async sendPagerDutyAlert(severity: string, alert: DeploymentAlert): Promise<void> {
    try {
      // In a real implementation, this would use PagerDuty API
      console.log(`PagerDuty alert (${severity}): ${alert.message}`);
    } catch (error) {
      console.error('Failed to send PagerDuty alert:', error);
    }
  }

  private async sendEmailAlert(to: string, subject: string, alert: DeploymentAlert): Promise<void> {
    try {
      // In a real implementation, this would use email service
      console.log(`Email alert to ${to}: ${subject}`);
    } catch (error) {
      console.error('Failed to send email alert:', error);
    }
  }

  private async reportDeploymentEvent(event: string, data: any): Promise<void> {
    try {
      await securityEventIntegration.logSecurityEvent({
        type: 'deployment_monitoring',
        severity: 'info',
        description: `Deployment monitoring event: ${event}`,
        metadata: data,
        timestamp: new Date(),
        source: 'deployment_monitor'
      });
    } catch (error) {
      console.error('Failed to report deployment event:', error);
    }
  }

  private async generateDeploymentReport(): Promise<void> {
    const report = {
      deploymentId: this.currentDeploymentId,
      duration: Date.now() - (this.alertHistory[0]?.timestamp.getTime() || Date.now()),
      totalAlerts: this.alertHistory.length,
      criticalAlerts: this.alertHistory.filter(a => a.severity === 'critical').length,
      warningAlerts: this.alertHistory.filter(a => a.severity === 'warning').length,
      autoActionsPerformed: this.alertHistory.filter(a => a.autoActionTaken).length,
      finalMetrics: await this.getCurrentMetrics()
    };

    console.log('Deployment monitoring report:', report);
    
    // Store report for analysis
    await this.storeDeploymentReport(report);
  }

  private async storeDeploymentReport(report: any): Promise<void> {
    try {
      // In a real implementation, this would store in database
      localStorage.setItem(`deployment-report-${report.deploymentId}`, JSON.stringify(report));
    } catch (error) {
      console.error('Failed to store deployment report:', error);
    }
  }

  // Public methods for manual control
  public async triggerManualRollback(reason: string): Promise<void> {
    console.log(`Manual rollback triggered: ${reason}`);
    
    const alert: DeploymentAlert = {
      id: `manual-rollback-${Date.now()}`,
      severity: 'critical',
      type: 'manual_rollback',
      message: `Manual rollback triggered: ${reason}`,
      metrics: {},
      timestamp: new Date(),
      deploymentId: this.currentDeploymentId!
    };

    await this.initiateAutomaticRollback(alert);
  }

  public getAlertHistory(): DeploymentAlert[] {
    return [...this.alertHistory];
  }

  public isCurrentlyMonitoring(): boolean {
    return this.isMonitoring;
  }

  public getCurrentDeploymentId(): string | null {
    return this.currentDeploymentId;
  }
}

export const deploymentMonitoring = new DeploymentMonitoringService();