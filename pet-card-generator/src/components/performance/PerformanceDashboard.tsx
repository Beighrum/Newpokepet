import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Zap, 
  Database, 
  Image, 
  Clock, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';
import { cn } from '@/lib/utils';

interface PerformanceDashboardProps {
  className?: string;
  showDetails?: boolean;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  className = '',
  showDetails = false
}) => {
  const {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearCaches,
    getPerformanceReport
  } = usePerformanceOptimization();

  const [detailedReport, setDetailedReport] = useState<any>(null);
  const [showDetailedReport, setShowDetailedReport] = useState(false);

  // Get detailed report
  const handleGetDetailedReport = () => {
    const report = getPerformanceReport();
    setDetailedReport(report);
    setShowDetailedReport(true);
  };

  // Format time values
  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get performance rating
  const getPerformanceRating = (metric: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
    const thresholds = {
      pageLoadTime: { good: 2000, poor: 4000 },
      firstContentfulPaint: { good: 1800, poor: 3000 },
      largestContentfulPaint: { good: 2500, poor: 4000 },
      cumulativeLayoutShift: { good: 0.1, poor: 0.25 }
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  };

  // Get rating color
  const getRatingColor = (rating: string): string => {
    switch (rating) {
      case 'good': return 'text-green-600 bg-green-100 border-green-200';
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'poor': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  // Get rating icon
  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case 'good': return <CheckCircle className="w-4 h-4" />;
      case 'needs-improvement': return <AlertTriangle className="w-4 h-4" />;
      case 'poor': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  if (!metrics) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-12">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Performance Monitoring</h3>
          <p className="text-gray-500 mb-4">Loading performance metrics...</p>
          <Button onClick={startMonitoring} disabled={isMonitoring}>
            <Zap className="w-4 h-4 mr-2" />
            Start Monitoring
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2 text-blue-600" />
                Performance Dashboard
              </CardTitle>
              <CardDescription>
                Real-time performance metrics and optimization insights
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant={isMonitoring ? "default" : "secondary"}>
                {isMonitoring ? 'Monitoring' : 'Stopped'}
              </Badge>
              
              <Button
                variant="outline"
                size="sm"
                onClick={isMonitoring ? stopMonitoring : startMonitoring}
              >
                {isMonitoring ? 'Stop' : 'Start'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleGetDetailedReport}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Report
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Core Web Vitals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Page Load Time */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="w-4 h-4 mr-2 text-blue-600" />
              Page Load Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatTime(metrics.pageLoadTime)}
              </div>
              <Badge className={cn(
                'text-xs',
                getRatingColor(getPerformanceRating('pageLoadTime', metrics.pageLoadTime))
              )}>
                {getRatingIcon(getPerformanceRating('pageLoadTime', metrics.pageLoadTime))}
                <span className="ml-1">
                  {getPerformanceRating('pageLoadTime', metrics.pageLoadTime).replace('-', ' ')}
                </span>
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* First Contentful Paint */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Zap className="w-4 h-4 mr-2 text-green-600" />
              First Contentful Paint
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatTime(metrics.firstContentfulPaint)}
              </div>
              <Badge className={cn(
                'text-xs',
                getRatingColor(getPerformanceRating('firstContentfulPaint', metrics.firstContentfulPaint))
              )}>
                {getRatingIcon(getPerformanceRating('firstContentfulPaint', metrics.firstContentfulPaint))}
                <span className="ml-1">
                  {getPerformanceRating('firstContentfulPaint', metrics.firstContentfulPaint).replace('-', ' ')}
                </span>
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Largest Contentful Paint */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-purple-600" />
              Largest Contentful Paint
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatTime(metrics.largestContentfulPaint)}
              </div>
              <Badge className={cn(
                'text-xs',
                getRatingColor(getPerformanceRating('largestContentfulPaint', metrics.largestContentfulPaint))
              )}>
                {getRatingIcon(getPerformanceRating('largestContentfulPaint', metrics.largestContentfulPaint))}
                <span className="ml-1">
                  {getPerformanceRating('largestContentfulPaint', metrics.largestContentfulPaint).replace('-', ' ')}
                </span>
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Cumulative Layout Shift */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingDown className="w-4 h-4 mr-2 text-orange-600" />
              Cumulative Layout Shift
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {metrics.cumulativeLayoutShift.toFixed(3)}
              </div>
              <Badge className={cn(
                'text-xs',
                getRatingColor(getPerformanceRating('cumulativeLayoutShift', metrics.cumulativeLayoutShift))
              )}>
                {getRatingIcon(getPerformanceRating('cumulativeLayoutShift', metrics.cumulativeLayoutShift))}
                <span className="ml-1">
                  {getPerformanceRating('cumulativeLayoutShift', metrics.cumulativeLayoutShift).replace('-', ' ')}
                </span>
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Memory Usage */}
      {metrics.memoryUsage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2 text-indigo-600" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Used: {formatBytes(metrics.memoryUsage.used)}</span>
                <span>Total: {formatBytes(metrics.memoryUsage.total)}</span>
                <span>Limit: {formatBytes(metrics.memoryUsage.limit)}</span>
              </div>
              
              <Progress 
                value={(metrics.memoryUsage.used / metrics.memoryUsage.total) * 100}
                className="h-2"
              />
              
              <div className="text-xs text-gray-600">
                Memory usage: {((metrics.memoryUsage.used / metrics.memoryUsage.total) * 100).toFixed(1)}%
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cache Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Image className="w-5 h-5 mr-2 text-green-600" />
              Image Cache
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Hit Rate:</span>
                <span className="font-medium">
                  {(metrics.cacheStats.imageCache.hitRate * 100).toFixed(1)}%
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Entries:</span>
                <span className="font-medium">{metrics.cacheStats.imageCache.entries}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Size:</span>
                <span className="font-medium">{formatBytes(metrics.cacheStats.imageCache.size)}</span>
              </div>
              
              <Progress 
                value={(metrics.cacheStats.imageCache.hitRate) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2 text-blue-600" />
              API Cache
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Hit Rate:</span>
                <span className="font-medium">
                  {(metrics.cacheStats.apiCache.hitRate * 100).toFixed(1)}%
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Entries:</span>
                <span className="font-medium">{metrics.cacheStats.apiCache.entries}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Size:</span>
                <span className="font-medium">{formatBytes(metrics.cacheStats.apiCache.size)}</span>
              </div>
              
              <Progress 
                value={(metrics.cacheStats.apiCache.hitRate) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Optimization Actions</CardTitle>
          <CardDescription>
            Tools to improve application performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Button
              variant="outline"
              onClick={clearCaches}
            >
              <Database className="w-4 h-4 mr-2" />
              Clear Caches
            </Button>
            
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Page
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Report Modal */}
      {showDetailedReport && detailedReport && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Detailed Performance Report</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetailedReport(false)}
              >
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-4 rounded-lg overflow-auto max-h-96">
              {JSON.stringify(detailedReport, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PerformanceDashboard;