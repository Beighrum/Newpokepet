import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  RefreshCw,
  Download,
  Trash2,
  WifiOff,
  Wifi,
  Clock,
  TrendingUp,
  Activity,
  Bug
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { useErrorLogging } from '@/services/errorLoggingService';
import { useOffline } from '@/services/offlineService';
import { cn } from '@/lib/utils';

interface ErrorHandlingDashboardProps {
  className?: string;
}

const ErrorHandlingDashboard: React.FC<ErrorHandlingDashboardProps> = ({
  className = ''
}) => {
  const { success, error, warning, info } = useToast();
  const { 
    getMetrics, 
    getErrors, 
    logError, 
    addBreadcrumb, 
    exportErrors 
  } = useErrorLogging();
  const { 
    status: offlineStatus, 
    isOnline, 
    queueSize, 
    sync, 
    getQueue, 
    clearQueue 
  } = useOffline();

  const [errorMetrics, setErrorMetrics] = useState(getMetrics());
  const [recentErrors, setRecentErrors] = useState(getErrors(10));
  const [offlineQueue, setOfflineQueue] = useState(getQueue());

  // Refresh data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setErrorMetrics(getMetrics());
      setRecentErrors(getErrors(10));
      setOfflineQueue(getQueue());
    }, 5000);

    return () => clearInterval(interval);
  }, [getMetrics, getErrors, getQueue]);

  // Test functions for demonstration
  const testErrorBoundary = () => {
    // This would trigger an error boundary in a real component
    logError(new Error('Test error boundary'), { source: 'dashboard-test' }, 'error', ['test']);
    error('Error Boundary Test', 'Simulated error boundary trigger');
  };

  const testToastNotifications = () => {
    success('Success!', 'This is a success message');
    setTimeout(() => warning('Warning!', 'This is a warning message'), 500);
    setTimeout(() => error('Error!', 'This is an error message'), 1000);
    setTimeout(() => info('Info!', 'This is an info message'), 1500);
  };

  const testRetryMechanism = async () => {
    let attempts = 0;
    const maxAttempts = 3;

    const retryFunction = async (): Promise<string> => {
      attempts++;
      addBreadcrumb(`Retry attempt ${attempts}`, 'retry', 'info');
      
      if (attempts < maxAttempts) {
        throw new Error(`Attempt ${attempts} failed`);
      }
      return 'Success after retries';
    };

    try {
      // Simulate retry logic
      for (let i = 0; i < maxAttempts; i++) {
        try {
          const result = await retryFunction();
          success('Retry Success', result);
          break;
        } catch (err) {
          if (i === maxAttempts - 1) {
            throw err;
          }
          warning(`Retry ${i + 1}`, `Attempt ${i + 1} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (err) {
      error('Retry Failed', 'All retry attempts exhausted');
    }
  };

  const testOfflineHandling = () => {
    if (isOnline) {
      info('Offline Test', 'Go offline to test offline functionality');
    } else {
      success('Offline Mode', 'Application is working offline');
    }
  };

  const handleExportErrors = () => {
    const errorData = exportErrors();
    const blob = new Blob([errorData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    success('Export Complete', 'Error logs exported successfully');
  };

  const handleSyncOfflineQueue = async () => {
    try {
      await sync();
      success('Sync Complete', 'Offline queue synced successfully');
    } catch (err) {
      error('Sync Failed', 'Failed to sync offline queue');
    }
  };

  const handleClearOfflineQueue = () => {
    clearQueue();
    success('Queue Cleared', 'Offline queue cleared successfully');
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getErrorLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-100 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'debug': return 'text-gray-600 bg-gray-100 border-gray-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getErrorLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <XCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'info': return <Info className="w-4 h-4" />;
      case 'debug': return <Bug className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
            Error Handling Dashboard
          </CardTitle>
          <CardDescription>
            Monitor and test comprehensive error handling features
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Test Error Handling Features</CardTitle>
          <CardDescription>
            Test different error handling mechanisms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              onClick={testErrorBoundary}
              variant="outline"
              className="flex items-center"
            >
              <Bug className="w-4 h-4 mr-2" />
              Error Boundary
            </Button>
            
            <Button
              onClick={testToastNotifications}
              variant="outline"
              className="flex items-center"
            >
              <Info className="w-4 h-4 mr-2" />
              Toast Notifications
            </Button>
            
            <Button
              onClick={testRetryMechanism}
              variant="outline"
              className="flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Mechanism
            </Button>
            
            <Button
              onClick={testOfflineHandling}
              variant="outline"
              className="flex items-center"
            >
              {isOnline ? (
                <Wifi className="w-4 h-4 mr-2" />
              ) : (
                <WifiOff className="w-4 h-4 mr-2" />
              )}
              Offline Handling
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Activity className="w-4 h-4 mr-2 text-red-600" />
              Total Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorMetrics.totalErrors}</div>
            <div className="text-xs text-gray-600 mt-1">
              All time errors logged
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-orange-600" />
              Recent Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorMetrics.recentErrors.length}</div>
            <div className="text-xs text-gray-600 mt-1">
              Last 24 hours
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              {isOnline ? (
                <Wifi className="w-4 h-4 mr-2 text-green-600" />
              ) : (
                <WifiOff className="w-4 h-4 mr-2 text-red-600" />
              )}
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge className={cn(
                'text-xs',
                isOnline 
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : 'bg-red-100 text-red-800 border-red-200'
              )}>
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Queue: {queueSize} items
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="w-4 h-4 mr-2 text-blue-600" />
              Last Online
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {formatTime(offlineStatus.lastOnlineTime)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Connection type: {offlineStatus.connectionType || 'Unknown'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Errors by Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(errorMetrics.errorsByLevel).map(([level, count]) => (
                <div key={level} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getErrorLevelIcon(level)}
                    <span className="capitalize">{level}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{count}</span>
                    <div className="w-20">
                      <Progress 
                        value={(count / errorMetrics.totalErrors) * 100} 
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Error Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(errorMetrics.errorsByType)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm">{type}</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{count}</span>
                      <div className="w-16">
                        <Progress 
                          value={(count / errorMetrics.totalErrors) * 100} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Errors</CardTitle>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportErrors}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recentErrors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p>No recent errors</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentErrors.map((errorLog) => (
                <div
                  key={errorLog.id}
                  className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getErrorLevelIcon(errorLog.level)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge className={cn('text-xs', getErrorLevelColor(errorLog.level))}>
                        {errorLog.level}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatTime(errorLog.timestamp)}
                      </span>
                    </div>
                    
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      {errorLog.message}
                    </div>
                    
                    <div className="text-xs text-gray-600">
                      {errorLog.url && (
                        <span>URL: {new URL(errorLog.url).pathname}</span>
                      )}
                      {errorLog.userId && (
                        <span className="ml-4">User: {errorLog.userId}</span>
                      )}
                    </div>
                    
                    {errorLog.tags && errorLog.tags.length > 0 && (
                      <div className="flex space-x-1 mt-2">
                        {errorLog.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Offline Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Offline Queue</CardTitle>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncOfflineQueue}
                disabled={!isOnline || queueSize === 0}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearOfflineQueue}
                disabled={queueSize === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {offlineQueue.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p>No items in offline queue</p>
            </div>
          ) : (
            <div className="space-y-3">
              {offlineQueue.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {item.type}
                      </Badge>
                      <Badge className={cn(
                        'text-xs',
                        item.priority === 'high' ? 'bg-red-100 text-red-800' :
                        item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      )}>
                        {item.priority}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      Retries: {item.retryCount}/{item.maxRetries}
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      {formatTime(item.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              
              {offlineQueue.length > 10 && (
                <div className="text-center text-sm text-gray-500">
                  ... and {offlineQueue.length - 10} more items
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorHandlingDashboard;