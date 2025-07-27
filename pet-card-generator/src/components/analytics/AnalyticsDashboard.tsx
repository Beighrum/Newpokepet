import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Activity, 
  TestTube, 
  Settings,
  Download,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import BusinessIntelligenceDashboard from './BusinessIntelligenceDashboard';
import PerformanceMonitoringDashboard from './PerformanceMonitoringDashboard';
import ABTestingDashboard from './ABTestingDashboard';

interface AnalyticsDashboardProps {
  className?: string;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const exportData = async (type: 'csv' | 'json') => {
    try {
      // In a real app, this would call an API to export data
      const response = await fetch(`/api/analytics/export?format=${type}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-data.${type}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className=\"flex items-center justify-between\">
        <div>
          <h1 className=\"text-3xl font-bold text-gray-900\">Analytics Dashboard</h1>
          <p className=\"text-gray-600\">Comprehensive analytics and insights for Pet Card Generator</p>
        </div>
        
        <div className=\"flex items-center space-x-4\">
          <Button onClick={() => exportData('csv')} variant=\"outline\">
            <Download className=\"w-4 h-4 mr-2\" />
            Export CSV
          </Button>
          
          <Button onClick={() => exportData('json')} variant=\"outline\">
            <Download className=\"w-4 h-4 mr-2\" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className=\"grid grid-cols-1 md:grid-cols-4 gap-6\">
        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Total Users</CardTitle>
            <Users className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold\">12,543</div>
            <p className=\"text-xs text-muted-foreground\">
              <span className=\"text-green-500\">+12.5%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Cards Generated</CardTitle>
            <BarChart3 className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold\">45,678</div>
            <p className=\"text-xs text-muted-foreground\">
              <span className=\"text-green-500\">+8.2%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Conversion Rate</CardTitle>
            <TrendingUp className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold\">12.5%</div>
            <p className=\"text-xs text-muted-foreground\">
              <span className=\"text-green-500\">+2.1%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Active Tests</CardTitle>
            <TestTube className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold\">3</div>
            <p className=\"text-xs text-muted-foreground\">
              2 running, 1 completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className=\"space-y-6\">
        <TabsList className=\"grid w-full grid-cols-4\">
          <TabsTrigger value=\"overview\" className=\"flex items-center space-x-2\">
            <BarChart3 className=\"w-4 h-4\" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value=\"business\" className=\"flex items-center space-x-2\">
            <TrendingUp className=\"w-4 h-4\" />
            <span>Business Intelligence</span>
          </TabsTrigger>
          <TabsTrigger value=\"performance\" className=\"flex items-center space-x-2\">
            <Activity className=\"w-4 h-4\" />
            <span>Performance</span>
          </TabsTrigger>
          <TabsTrigger value=\"abtesting\" className=\"flex items-center space-x-2\">
            <TestTube className=\"w-4 h-4\" />
            <span>A/B Testing</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value=\"overview\" className=\"space-y-6\">
          <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest user actions and system events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className=\"space-y-4\">
                  <div className=\"flex items-center space-x-3\">
                    <div className=\"w-2 h-2 bg-green-500 rounded-full\"></div>
                    <div className=\"flex-1\">
                      <p className=\"text-sm font-medium\">New user signup</p>
                      <p className=\"text-xs text-gray-500\">2 minutes ago</p>
                    </div>
                    <Badge variant=\"outline\">Signup</Badge>
                  </div>
                  
                  <div className=\"flex items-center space-x-3\">
                    <div className=\"w-2 h-2 bg-blue-500 rounded-full\"></div>
                    <div className=\"flex-1\">
                      <p className=\"text-sm font-medium\">Card generated successfully</p>
                      <p className=\"text-xs text-gray-500\">5 minutes ago</p>
                    </div>
                    <Badge variant=\"outline\">Generation</Badge>
                  </div>
                  
                  <div className=\"flex items-center space-x-3\">
                    <div className=\"w-2 h-2 bg-purple-500 rounded-full\"></div>
                    <div className=\"flex-1\">
                      <p className=\"text-sm font-medium\">Premium subscription purchased</p>
                      <p className=\"text-xs text-gray-500\">12 minutes ago</p>
                    </div>
                    <Badge variant=\"outline\">Purchase</Badge>
                  </div>
                  
                  <div className=\"flex items-center space-x-3\">
                    <div className=\"w-2 h-2 bg-orange-500 rounded-full\"></div>
                    <div className=\"flex-1\">
                      <p className=\"text-sm font-medium\">A/B test exposure logged</p>
                      <p className=\"text-xs text-gray-500\">15 minutes ago</p>
                    </div>
                    <Badge variant=\"outline\">A/B Test</Badge>
                  </div>
                  
                  <div className=\"flex items-center space-x-3\">
                    <div className=\"w-2 h-2 bg-red-500 rounded-full\"></div>
                    <div className=\"flex-1\">
                      <p className=\"text-sm font-medium\">Error: Image processing failed</p>
                      <p className=\"text-xs text-gray-500\">18 minutes ago</p>
                    </div>
                    <Badge variant=\"destructive\">Error</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Current system status and performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className=\"space-y-4\">
                  <div className=\"flex items-center justify-between\">
                    <span className=\"text-sm font-medium\">API Response Time</span>
                    <div className=\"flex items-center space-x-2\">
                      <span className=\"text-sm\">245ms</span>
                      <div className=\"w-2 h-2 bg-green-500 rounded-full\"></div>
                    </div>
                  </div>
                  
                  <div className=\"flex items-center justify-between\">
                    <span className=\"text-sm font-medium\">Error Rate</span>
                    <div className=\"flex items-center space-x-2\">
                      <span className=\"text-sm\">0.8%</span>
                      <div className=\"w-2 h-2 bg-green-500 rounded-full\"></div>
                    </div>
                  </div>
                  
                  <div className=\"flex items-center justify-between\">
                    <span className=\"text-sm font-medium\">System Uptime</span>
                    <div className=\"flex items-center space-x-2\">
                      <span className=\"text-sm\">99.95%</span>
                      <div className=\"w-2 h-2 bg-green-500 rounded-full\"></div>
                    </div>
                  </div>
                  
                  <div className=\"flex items-center justify-between\">
                    <span className=\"text-sm font-medium\">Active Users</span>
                    <div className=\"flex items-center space-x-2\">
                      <span className=\"text-sm\">127</span>
                      <div className=\"w-2 h-2 bg-green-500 rounded-full animate-pulse\"></div>
                    </div>
                  </div>
                  
                  <div className=\"flex items-center justify-between\">
                    <span className=\"text-sm font-medium\">Database Performance</span>
                    <div className=\"flex items-center space-x-2\">
                      <span className=\"text-sm\">Good</span>
                      <div className=\"w-2 h-2 bg-green-500 rounded-full\"></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Metrics Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Key Metrics Summary</CardTitle>
              <CardDescription>Overview of important business and technical metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className=\"grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4\">
                <div className=\"text-center\">
                  <div className=\"text-2xl font-bold text-blue-600\">3,421</div>
                  <div className=\"text-sm text-gray-600\">Daily Active Users</div>
                </div>
                
                <div className=\"text-center\">
                  <div className=\"text-2xl font-bold text-green-600\">234</div>
                  <div className=\"text-sm text-gray-600\">Cards Today</div>
                </div>
                
                <div className=\"text-center\">
                  <div className=\"text-2xl font-bold text-purple-600\">$15,420</div>
                  <div className=\"text-sm text-gray-600\">Monthly Revenue</div>
                </div>
                
                <div className=\"text-center\">
                  <div className=\"text-2xl font-bold text-orange-600\">4m 5s</div>
                  <div className=\"text-sm text-gray-600\">Avg Session</div>
                </div>
                
                <div className=\"text-center\">
                  <div className=\"text-2xl font-bold text-red-600\">32.1%</div>
                  <div className=\"text-sm text-gray-600\">Bounce Rate</div>
                </div>
                
                <div className=\"text-center\">
                  <div className=\"text-2xl font-bold text-indigo-600\">12.5%</div>
                  <div className=\"text-sm text-gray-600\">Conversion Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value=\"business\">
          <BusinessIntelligenceDashboard />
        </TabsContent>

        <TabsContent value=\"performance\">
          <PerformanceMonitoringDashboard />
        </TabsContent>

        <TabsContent value=\"abtesting\">
          <ABTestingDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;