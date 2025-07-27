import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CreditCard, 
  Activity, 
  DollarSign,
  Eye,
  MousePointer,
  Clock,
  Target,
  Zap,
  Globe,
  Smartphone,
  Monitor,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BusinessMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  totalCards: number;
  cardsToday: number;
  conversionRate: number;
  revenue: number;
  averageSessionDuration: number;
  bounceRate: number;
  pageViews: number;
  uniquePageViews: number;
}

interface UserEngagementData {
  date: string;
  activeUsers: number;
  newUsers: number;
  sessions: number;
  pageViews: number;
}

interface ConversionFunnelData {
  step: string;
  users: number;
  conversionRate: number;
}

interface DeviceBreakdown {
  device: string;
  users: number;
  percentage: number;
}

interface TopPages {
  page: string;
  views: number;
  uniqueViews: number;
  avgTimeOnPage: number;
  bounceRate: number;
}

interface BusinessIntelligenceDashboardProps {
  className?: string;
}

const BusinessIntelligenceDashboard: React.FC<BusinessIntelligenceDashboardProps> = ({
  className = ''
}) => {
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [engagementData, setEngagementData] = useState<UserEngagementData[]>([]);
  const [funnelData, setFunnelData] = useState<ConversionFunnelData[]>([]);
  const [deviceData, setDeviceData] = useState<DeviceBreakdown[]>([]);
  const [topPages, setTopPages] = useState<TopPages[]>([]);
  const [dateRange, setDateRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // In a real app, these would be API calls
      await Promise.all([
        loadBusinessMetrics(),
        loadEngagementData(),
        loadFunnelData(),
        loadDeviceData(),
        loadTopPages()
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBusinessMetrics = async () => {
    // Mock data - in production, this would come from analytics API
    const mockMetrics: BusinessMetrics = {
      totalUsers: 12543,
      activeUsers: 3421,
      newUsers: 892,
      returningUsers: 2529,
      totalCards: 45678,
      cardsToday: 234,
      conversionRate: 12.5,
      revenue: 15420.50,
      averageSessionDuration: 245,
      bounceRate: 32.1,
      pageViews: 89234,
      uniquePageViews: 67891
    };
    setMetrics(mockMetrics);
  };

  const loadEngagementData = async () => {
    // Mock engagement data
    const mockData: UserEngagementData[] = [
      { date: '2024-01-01', activeUsers: 1200, newUsers: 150, sessions: 1800, pageViews: 5400 },
      { date: '2024-01-02', activeUsers: 1350, newUsers: 180, sessions: 2000, pageViews: 6200 },
      { date: '2024-01-03', activeUsers: 1100, newUsers: 120, sessions: 1650, pageViews: 4950 },
      { date: '2024-01-04', activeUsers: 1450, newUsers: 200, sessions: 2200, pageViews: 6800 },
      { date: '2024-01-05', activeUsers: 1600, newUsers: 220, sessions: 2400, pageViews: 7200 },
      { date: '2024-01-06', activeUsers: 1300, newUsers: 160, sessions: 1950, pageViews: 5850 },
      { date: '2024-01-07', activeUsers: 1500, newUsers: 190, sessions: 2250, pageViews: 6750 }
    ];
    setEngagementData(mockData);
  };

  const loadFunnelData = async () => {
    const mockFunnel: ConversionFunnelData[] = [
      { step: 'Landing Page', users: 10000, conversionRate: 100 },
      { step: 'Sign Up', users: 3500, conversionRate: 35 },
      { step: 'Upload Image', users: 2800, conversionRate: 80 },
      { step: 'Generate Card', users: 2400, conversionRate: 85.7 },
      { step: 'Download/Share', users: 2100, conversionRate: 87.5 },
      { step: 'Premium Upgrade', users: 350, conversionRate: 16.7 }
    ];
    setFunnelData(mockFunnel);
  };

  const loadDeviceData = async () => {
    const mockDevices: DeviceBreakdown[] = [
      { device: 'Desktop', users: 6500, percentage: 52 },
      { device: 'Mobile', users: 4800, percentage: 38 },
      { device: 'Tablet', users: 1200, percentage: 10 }
    ];
    setDeviceData(mockDevices);
  };

  const loadTopPages = async () => {
    const mockPages: TopPages[] = [
      { page: '/', views: 25000, uniqueViews: 18500, avgTimeOnPage: 45, bounceRate: 28 },
      { page: '/upload', views: 15000, uniqueViews: 12000, avgTimeOnPage: 120, bounceRate: 15 },
      { page: '/gallery', views: 12000, uniqueViews: 9500, avgTimeOnPage: 90, bounceRate: 22 },
      { page: '/pricing', views: 8000, uniqueViews: 6800, avgTimeOnPage: 60, bounceRate: 35 },
      { page: '/profile', views: 5000, uniqueViews: 4200, avgTimeOnPage: 75, bounceRate: 18 }
    ];
    setTopPages(mockPages);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];

  if (isLoading || !metrics) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading dashboard data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Business Intelligence</h1>
          <p className="text-gray-600">Analytics and insights for Pet Card Generator</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          
          <Button onClick={loadDashboardData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.totalUsers)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              <span className="text-green-500">+12.5%</span>
              <span className="ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.activeUsers)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              <span className="text-green-500">+8.2%</span>
              <span className="ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cards Generated</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.totalCards)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              <span className="text-green-500">+{metrics.cardsToday}</span>
              <span className="ml-1">today</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.revenue)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              <span className="text-green-500">+15.3%</span>
              <span className="ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Engagement Chart */}
        <Card>
          <CardHeader>
            <CardTitle>User Engagement Trends</CardTitle>
            <CardDescription>Daily active users and new user acquisition</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString()} />
                <YAxis />
                <Tooltip labelFormatter={(date) => new Date(date).toLocaleDateString()} />
                <Area type="monotone" dataKey="activeUsers" stackId="1" stroke="#8884d8" fill="#8884d8" name="Active Users" />
                <Area type="monotone" dataKey="newUsers" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="New Users" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>User journey from landing to conversion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {funnelData.map((step, index) => (
                <div key={step.step} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{step.step}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{formatNumber(step.users)}</span>
                      <Badge variant="outline">{step.conversionRate.toFixed(1)}%</Badge>
                    </div>
                  </div>
                  <Progress value={step.conversionRate} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Device Breakdown</CardTitle>
            <CardDescription>User distribution by device type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ device, percentage }) => `${device} ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="users"
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 space-y-2">
              {deviceData.map((device, index) => (
                <div key={device.device} className="flex items-center justify-between">
                  <div className="flex items-center">
                    {device.device === 'Desktop' && <Monitor className="w-4 h-4 mr-2" />}
                    {device.device === 'Mobile' && <Smartphone className="w-4 h-4 mr-2" />}
                    {device.device === 'Tablet' && <Globe className="w-4 h-4 mr-2" />}
                    <span className="text-sm">{device.device}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{formatNumber(device.users)}</span>
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
            <CardDescription>Most visited pages and their performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPages.map((page) => (
                <div key={page.page} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{page.page}</span>
                    <span className="text-sm text-gray-600">{formatNumber(page.views)} views</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
                    <div className="flex items-center">
                      <Eye className="w-3 h-3 mr-1" />
                      <span>{formatNumber(page.uniqueViews)} unique</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{formatDuration(page.avgTimeOnPage)}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <MousePointer className="w-3 h-3 mr-1" />
                      <span>{page.bounceRate}% bounce</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Session Metrics</CardTitle>
            <CardDescription>User session behavior and engagement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Session Duration</span>
              <span className="font-medium">{formatDuration(metrics.averageSessionDuration)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Bounce Rate</span>
              <div className="flex items-center">
                <span className="font-medium">{metrics.bounceRate}%</span>
                <TrendingDown className="w-3 h-3 ml-1 text-green-500" />
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pages per Session</span>
              <span className="font-medium">{(metrics.pageViews / metrics.activeUsers).toFixed(1)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Conversion Rate</span>
              <div className="flex items-center">
                <span className="font-medium">{metrics.conversionRate}%</span>
                <TrendingUp className="w-3 h-3 ml-1 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Acquisition */}
        <Card>
          <CardHeader>
            <CardTitle>User Acquisition</CardTitle>
            <CardDescription>New vs returning user breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">New Users</span>
                  <span className="font-medium">{formatNumber(metrics.newUsers)}</span>
                </div>
                <Progress value={(metrics.newUsers / metrics.totalUsers) * 100} className="h-2" />
                <span className="text-xs text-gray-500">{((metrics.newUsers / metrics.totalUsers) * 100).toFixed(1)}% of total</span>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Returning Users</span>
                  <span className="font-medium">{formatNumber(metrics.returningUsers)}</span>
                </div>
                <Progress value={(metrics.returningUsers / metrics.totalUsers) * 100} className="h-2" />
                <span className="text-xs text-gray-500">{((metrics.returningUsers / metrics.totalUsers) * 100).toFixed(1)}% of total</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Page Views</span>
              <span className="font-medium">{formatNumber(metrics.pageViews)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Unique Page Views</span>
              <span className="font-medium">{formatNumber(metrics.uniquePageViews)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cards per User</span>
              <span className="font-medium">{(metrics.totalCards / metrics.totalUsers).toFixed(1)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Revenue per User</span>
              <span className="font-medium">{formatCurrency(metrics.revenue / metrics.totalUsers)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Real-time Activity</CardTitle>
          <CardDescription>Live user activity and system status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">127</div>
              <div className="text-sm text-gray-600">Active Users</div>
              <div className="flex items-center justify-center mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                <span className="text-xs text-green-500">Live</span>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">23</div>
              <div className="text-sm text-gray-600">Cards Being Generated</div>
              <div className="flex items-center justify-center mt-1">
                <Zap className="w-3 h-3 text-blue-500 mr-1" />
                <span className="text-xs text-blue-500">Processing</span>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">8</div>
              <div className="text-sm text-gray-600">Premium Upgrades</div>
              <div className="flex items-center justify-center mt-1">
                <Target className="w-3 h-3 text-purple-500 mr-1" />
                <span className="text-xs text-purple-500">Today</span>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">99.8%</div>
              <div className="text-sm text-gray-600">System Uptime</div>
              <div className="flex items-center justify-center mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                <span className="text-xs text-green-500">Healthy</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessIntelligenceDashboard;