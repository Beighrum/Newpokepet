import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart
} from 'recharts';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Cpu, 
  Database, 
  Globe, 
  HardDrive, 
  MemoryStick, 
  RefreshCw, 
  Server, 
  TrendingDown, 
  TrendingUp, 
  Wifi, 
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  services: {
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime: number;
    uptime: number;
  }[];
}

interface WebVitals {
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
}

interface PerformanceData {
  timestamp: string;
  responseTime: number;
  throughput: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
}

interface ErrorData {
  timestamp: string;
  errorType: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface PerformanceMonitoringDashboardProps {
  className?: string;
}

const PerformanceMonitoringDashboard: React.FC<PerformanceMonitoringDashboardProps> = ({
  className = ''
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [webVitals, setWebVitals] = useState<WebVitals | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [errorData, setErrorData] = useState<ErrorData[]>([]);
  const [timeRange, setTimeRange] = useState('1h');
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadPerformanceData();
    
    if (autoRefresh) {
      const interval = setInterval(loadPerformanceData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [timeRange, autoRefresh]);

  const loadPerformanceData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadMetrics(),
        loadSystemHealth(),
        loadWebVitals(),
        loadPerformanceHistory(),
        loadErrorHistory()
      ]);
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMetrics = async () => {
    // Mock data - in production, this would come from monitoring API
    const mockMetrics: PerformanceMetrics = {
      responseTime: 245,
      throughput: 1250,
      errorRate: 0.8,
      uptime: 99.95,
      cpuUsage: 45.2,
      memoryUsage: 62.8,
      diskUsage: 34.5,
      networkLatency: 12
    };
    setMetrics(mockMetrics);
  };

  const loadSystemHealth = async () => {
    const mockHealth: SystemHealth = {
      status: 'healthy',
      services: [
        { name: 'Web Server', status: 'up', responseTime: 120, uptime: 99.98 },
        { name: 'API Gateway', status: 'up', responseTime: 85, uptime: 99.95 },
        { name: 'Database', status: 'up', responseTime: 45, uptime: 99.99 },
        { name: 'Image Processing', status: 'degraded', responseTime: 850, uptime: 98.5 },
        { name: 'File Storage', status: 'up', responseTime: 25, uptime: 99.97 },
        { name: 'Authentication', status: 'up', responseTime: 95, uptime: 99.92 }
      ]
    };
    setSystemHealth(mockHealth);
  };

  const loadWebVitals = async () => {
    const mockVitals: WebVitals = {
      firstContentfulPaint: 1.2,
      largestContentfulPaint: 2.1,
      firstInputDelay: 45,
      cumulativeLayoutShift: 0.08,
      timeToInteractive: 3.2
    };
    setWebVitals(mockVitals);
  };

  const loadPerformanceHistory = async () => {
    // Generate mock historical data
    const now = Date.now();
    const mockData: PerformanceData[] = [];
    
    for (let i = 60; i >= 0; i--) {
      mockData.push({
        timestamp: new Date(now - i * 60000).toISOString(),
        responseTime: 200 + Math.random() * 100,
        throughput: 1000 + Math.random() * 500,
        errorRate: Math.random() * 2,
        cpuUsage: 30 + Math.random() * 40,
        memoryUsage: 50 + Math.random() * 30
      });
    }
    
    setPerformanceData(mockData);
  };

  const loadErrorHistory = async () => {
    const mockErrors: ErrorData[] = [
      { timestamp: '2024-01-07T10:00:00Z', errorType: '500 Internal Server Error', count: 3, severity: 'high' },
      { timestamp: '2024-01-07T10:15:00Z', errorType: '404 Not Found', count: 12, severity: 'low' },
      { timestamp: '2024-01-07T10:30:00Z', errorType: 'Database Connection Timeout', count: 1, severity: 'critical' },
      { timestamp: '2024-01-07T10:45:00Z', errorType: 'Rate Limit Exceeded', count: 8, severity: 'medium' },
      { timestamp: '2024-01-07T11:00:00Z', errorType: 'Image Processing Failed', count: 5, severity: 'medium' }
    ];
    setErrorData(mockErrors);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'up':
      case 'healthy':
        return 'text-green-500';
      case 'degraded':
      case 'warning':
        return 'text-yellow-500';
      case 'down':
      case 'critical':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up':
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded':
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'down':
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getWebVitalStatus = (metric: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
    const thresholds = {
      firstContentfulPaint: { good: 1.8, poor: 3.0 },
      largestContentfulPaint: { good: 2.5, poor: 4.0 },
      firstInputDelay: { good: 100, poor: 300 },
      cumulativeLayoutShift: { good: 0.1, poor: 0.25 },
      timeToInteractive: { good: 3.8, poor: 7.3 }
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (isLoading || !metrics || !systemHealth || !webVitals) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading performance data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Performance Monitoring</h1>
          <p className="text-gray-600">Real-time system performance and health metrics</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="15m">Last 15 minutes</option>
            <option value="1h">Last hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
          </select>
          
          <Button 
            onClick={() => setAutoRefresh(!autoRefresh)} 
            variant={autoRefresh ? "default" : "outline"}
          >
            <Activity className="w-4 h-4 mr-2" />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          
          <Button onClick={loadPerformanceData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Status Alert */}
      {systemHealth.status !== 'healthy' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            System is experiencing {systemHealth.status === 'warning' ? 'minor issues' : 'critical problems'}. 
            Check service status below for details.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.responseTime}ms</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 mr-1 text-green-500" />
              <span className="text-green-500">-5.2%</span>
              <span className="ml-1">from last hour</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Throughput</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.throughput}/min</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              <span className="text-green-500">+12.3%</span>
              <span className="ml-1">from last hour</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.errorRate}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 mr-1 text-green-500" />
              <span className="text-green-500">-0.3%</span>
              <span className="ml-1">from last hour</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.uptime}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
              <span className="text-green-500">Excellent</span>
              <span className="ml-1">last 30 days</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Response Time Trends</CardTitle>
            <CardDescription>Average response time over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                  formatter={(value: number) => [`${value.toFixed(0)}ms`, 'Response Time']}
                />
                <Line 
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* System Resources */}
        <Card>
          <CardHeader>
            <CardTitle>System Resources</CardTitle>
            <CardDescription>CPU, memory, and disk usage</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                  formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                />
                <Area 
                  type="monotone" 
                  dataKey="cpuUsage" 
                  stackId="1" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  name="CPU Usage"
                />
                <Area 
                  type="monotone" 
                  dataKey="memoryUsage" 
                  stackId="1" 
                  stroke="#82ca9d" 
                  fill="#82ca9d" 
                  name="Memory Usage"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Service Health and Web Vitals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Health */}
        <Card>
          <CardHeader>
            <CardTitle>Service Health</CardTitle>
            <CardDescription>Status of individual services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemHealth.services.map((service) => (
                <div key={service.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(service.status)}
                    <div>
                      <div className="font-medium">{service.name}</div>
                      <div className="text-sm text-gray-500">
                        {service.responseTime}ms • {service.uptime}% uptime
                      </div>
                    </div>
                  </div>
                  <Badge 
                    variant={service.status === 'up' ? 'default' : service.status === 'degraded' ? 'secondary' : 'destructive'}
                  >
                    {service.status.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Web Vitals */}
        <Card>
          <CardHeader>
            <CardTitle>Core Web Vitals</CardTitle>
            <CardDescription>User experience performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">First Contentful Paint</span>
                  <Badge variant={getWebVitalStatus('firstContentfulPaint', webVitals.firstContentfulPaint) === 'good' ? 'default' : 'secondary'}>
                    {webVitals.firstContentfulPaint.toFixed(1)}s
                  </Badge>
                </div>
                <Progress 
                  value={Math.min((webVitals.firstContentfulPaint / 3.0) * 100, 100)} 
                  className="h-2" 
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Largest Contentful Paint</span>
                  <Badge variant={getWebVitalStatus('largestContentfulPaint', webVitals.largestContentfulPaint) === 'good' ? 'default' : 'secondary'}>
                    {webVitals.largestContentfulPaint.toFixed(1)}s
                  </Badge>
                </div>
                <Progress 
                  value={Math.min((webVitals.largestContentfulPaint / 4.0) * 100, 100)} 
                  className="h-2" 
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">First Input Delay</span>
                  <Badge variant={getWebVitalStatus('firstInputDelay', webVitals.firstInputDelay) === 'good' ? 'default' : 'secondary'}>
                    {webVitals.firstInputDelay}ms
                  </Badge>
                </div>
                <Progress 
                  value={Math.min((webVitals.firstInputDelay / 300) * 100, 100)} 
                  className="h-2" 
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Cumulative Layout Shift</span>
                  <Badge variant={getWebVitalStatus('cumulativeLayoutShift', webVitals.cumulativeLayoutShift) === 'good' ? 'default' : 'secondary'}>
                    {webVitals.cumulativeLayoutShift.toFixed(3)}
                  </Badge>
                </div>
                <Progress 
                  value={Math.min((webVitals.cumulativeLayoutShift / 0.25) * 100, 100)} 
                  className="h-2" 
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Time to Interactive</span>
                  <Badge variant={getWebVitalStatus('timeToInteractive', webVitals.timeToInteractive) === 'good' ? 'default' : 'secondary'}>
                    {webVitals.timeToInteractive.toFixed(1)}s
                  </Badge>
                </div>
                <Progress 
                  value={Math.min((webVitals.timeToInteractive / 7.3) * 100, 100)} 
                  className="h-2" 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage and Recent Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resource Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Resource Usage</CardTitle>
            <CardDescription>Current system resource utilization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Cpu className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">CPU Usage</span>
                </div>
                <span className="text-sm font-medium">{metrics.cpuUsage}%</span>
              </div>
              <Progress value={metrics.cpuUsage} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <MemoryStick className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">Memory Usage</span>
                </div>
                <span className="text-sm font-medium">{metrics.memoryUsage}%</span>
              </div>
              <Progress value={metrics.memoryUsage} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <HardDrive className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">Disk Usage</span>
                </div>
                <span className="text-sm font-medium">{metrics.diskUsage}%</span>
              </div>
              <Progress value={metrics.diskUsage} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Wifi className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">Network Latency</span>
                </div>
                <span className="text-sm font-medium">{metrics.networkLatency}ms</span>
              </div>
              <Progress value={(metrics.networkLatency / 100) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Recent Errors */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Errors</CardTitle>
            <CardDescription>Latest system errors and issues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {errorData.map((error, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className={cn(
                      "w-4 h-4",
                      error.severity === 'critical' ? 'text-red-500' :
                      error.severity === 'high' ? 'text-orange-500' :
                      error.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                    )} />
                    <div>
                      <div className="font-medium text-sm">{error.errorType}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(error.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{error.count}</div>
                    <Badge 
                      variant={
                        error.severity === 'critical' ? 'destructive' :
                        error.severity === 'high' ? 'destructive' :
                        error.severity === 'medium' ? 'secondary' : 'outline'
                      }
                      className="text-xs"
                    >
                      {error.severity.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PerformanceMonitoringDashboard;