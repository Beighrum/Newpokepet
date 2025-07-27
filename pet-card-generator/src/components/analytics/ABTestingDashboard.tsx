import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Cell
} from 'recharts';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  MousePointer, 
  Pause, 
  Play, 
  Plus, 
  RefreshCw, 
  Settings, 
  TrendingUp, 
  Users, 
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import abTestingService from '@/services/abTestingService';

interface ABTestSummary {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate: string;
  endDate?: string;
  participants: number;
  conversions: number;
  conversionRate: number;
  confidence: number;
  winner?: string;
  variants: {
    id: string;
    name: string;
    participants: number;
    conversions: number;
    conversionRate: number;
    isControl: boolean;
  }[];
}

interface TestResults {
  testId: string;
  variants: {
    variantId: string;
    name: string;
    participants: number;
    conversions: number;
    conversionRate: number;
    confidenceInterval: {
      lower: number;
      upper: number;
    };
    statisticalSignificance: boolean;
    isWinner: boolean;
  }[];
  overallResults: {
    totalParticipants: number;
    totalConversions: number;
    averageConversionRate: number;
    testDuration: number;
    confidence: number;
  };
}

interface ABTestingDashboardProps {
  className?: string;
}

const ABTestingDashboard: React.FC<ABTestingDashboardProps> = ({
  className = ''
}) => {
  const [tests, setTests] = useState<ABTestSummary[]>([]);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadTests();
  }, []);

  useEffect(() => {
    if (selectedTest) {
      loadTestResults(selectedTest);
    }
  }, [selectedTest]);

  const loadTests = async () => {
    setIsLoading(true);
    try {
      // Mock data - in production, this would come from A/B testing service
      const mockTests: ABTestSummary[] = [
        {
          id: 'hero_cta_test',
          name: 'Hero CTA Button Test',
          status: 'running',
          startDate: '2024-01-01T00:00:00Z',
          participants: 2450,
          conversions: 245,
          conversionRate: 10.0,
          confidence: 95,
          variants: [
            {
              id: 'control',
              name: 'Get Started',
              participants: 1225,
              conversions: 110,
              conversionRate: 8.98,
              isControl: true
            },
            {
              id: 'variant_a',
              name: 'Create Your Card',
              participants: 1225,
              conversions: 135,
              conversionRate: 11.02,
              isControl: false
            }
          ]
        },
        {
          id: 'pricing_display_test',
          name: 'Pricing Display Test',
          status: 'running',
          startDate: '2024-01-03T00:00:00Z',
          participants: 1890,
          conversions: 189,
          conversionRate: 10.0,
          confidence: 85,
          variants: [
            {
              id: 'control',
              name: 'Monthly First',
              participants: 630,
              conversions: 57,
              conversionRate: 9.05,
              isControl: true
            },
            {
              id: 'variant_a',
              name: 'Annual First',
              participants: 630,
              conversions: 69,
              conversionRate: 10.95,
              isControl: false
            },
            {
              id: 'variant_b',
              name: 'Discount Highlight',
              participants: 630,
              conversions: 63,
              conversionRate: 10.0,
              isControl: false
            }
          ]
        },
        {
          id: 'onboarding_flow_test',
          name: 'Onboarding Flow Test',
          status: 'completed',
          startDate: '2023-12-15T00:00:00Z',
          endDate: '2024-01-01T00:00:00Z',
          participants: 5000,
          conversions: 750,
          conversionRate: 15.0,
          confidence: 99,
          winner: 'variant_a',
          variants: [
            {
              id: 'control',
              name: 'Single Step',
              participants: 2500,
              conversions: 325,
              conversionRate: 13.0,
              isControl: true
            },
            {
              id: 'variant_a',
              name: 'Multi-Step Wizard',
              participants: 2500,
              conversions: 425,
              conversionRate: 17.0,
              isControl: false
            }
          ]
        }
      ];\n      setTests(mockTests);\n      if (mockTests.length > 0 && !selectedTest) {\n        setSelectedTest(mockTests[0].id);\n      }\n    } catch (error) {\n      console.error('Failed to load A/B tests:', error);\n    } finally {\n      setIsLoading(false);\n    }\n  };\n\n  const loadTestResults = async (testId: string) => {\n    try {\n      const test = tests.find(t => t.id === testId);\n      if (!test) return;\n\n      // Mock detailed results\n      const mockResults: TestResults = {\n        testId,\n        variants: test.variants.map(variant => ({\n          variantId: variant.id,\n          name: variant.name,\n          participants: variant.participants,\n          conversions: variant.conversions,\n          conversionRate: variant.conversionRate,\n          confidenceInterval: {\n            lower: variant.conversionRate - 1.5,\n            upper: variant.conversionRate + 1.5\n          },\n          statisticalSignificance: variant.conversionRate > 10,\n          isWinner: test.winner === variant.id\n        })),\n        overallResults: {\n          totalParticipants: test.participants,\n          totalConversions: test.conversions,\n          averageConversionRate: test.conversionRate,\n          testDuration: test.endDate ? \n            Math.floor((new Date(test.endDate).getTime() - new Date(test.startDate).getTime()) / (1000 * 60 * 60 * 24)) :\n            Math.floor((Date.now() - new Date(test.startDate).getTime()) / (1000 * 60 * 60 * 24)),\n          confidence: test.confidence\n        }\n      };\n      \n      setTestResults(mockResults);\n    } catch (error) {\n      console.error('Failed to load test results:', error);\n    }\n  };\n\n  const handleStartTest = async (testId: string) => {\n    try {\n      abTestingService.startTest(testId);\n      await loadTests();\n    } catch (error) {\n      console.error('Failed to start test:', error);\n    }\n  };\n\n  const handleStopTest = async (testId: string) => {\n    try {\n      abTestingService.stopTest(testId);\n      await loadTests();\n    } catch (error) {\n      console.error('Failed to stop test:', error);\n    }\n  };\n\n  const getStatusColor = (status: string): string => {\n    switch (status) {\n      case 'running':\n        return 'text-green-500';\n      case 'paused':\n        return 'text-yellow-500';\n      case 'completed':\n        return 'text-blue-500';\n      case 'draft':\n        return 'text-gray-500';\n      default:\n        return 'text-gray-500';\n    }\n  };\n\n  const getStatusIcon = (status: string) => {\n    switch (status) {\n      case 'running':\n        return <Play className=\"w-4 h-4 text-green-500\" />;\n      case 'paused':\n        return <Pause className=\"w-4 h-4 text-yellow-500\" />;\n      case 'completed':\n        return <CheckCircle className=\"w-4 h-4 text-blue-500\" />;\n      case 'draft':\n        return <Settings className=\"w-4 h-4 text-gray-500\" />;\n      default:\n        return <Activity className=\"w-4 h-4 text-gray-500\" />;\n    }\n  };\n\n  const formatDuration = (days: number): string => {\n    if (days < 1) return 'Less than 1 day';\n    if (days === 1) return '1 day';\n    return `${days} days`;\n  };\n\n  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];\n\n  if (isLoading) {\n    return (\n      <div className={cn('space-y-6', className)}>\n        <div className=\"flex items-center justify-center h-64\">\n          <RefreshCw className=\"w-8 h-8 animate-spin text-gray-400\" />\n          <span className=\"ml-2 text-gray-600\">Loading A/B tests...</span>\n        </div>\n      </div>\n    );\n  }\n\n  const selectedTestData = tests.find(t => t.id === selectedTest);\n\n  return (\n    <div className={cn('space-y-6', className)}>\n      {/* Header */}\n      <div className=\"flex items-center justify-between\">\n        <div>\n          <h1 className=\"text-3xl font-bold text-gray-900\">A/B Testing Dashboard</h1>\n          <p className=\"text-gray-600\">Manage and analyze your A/B tests</p>\n        </div>\n        \n        <div className=\"flex items-center space-x-4\">\n          <Button onClick={() => setShowCreateModal(true)}>\n            <Plus className=\"w-4 h-4 mr-2\" />\n            Create Test\n          </Button>\n          \n          <Button onClick={loadTests} variant=\"outline\">\n            <RefreshCw className=\"w-4 h-4 mr-2\" />\n            Refresh\n          </Button>\n        </div>\n      </div>\n\n      {/* Test Overview */}\n      <div className=\"grid grid-cols-1 md:grid-cols-4 gap-6\">\n        <Card>\n          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">\n            <CardTitle className=\"text-sm font-medium\">Active Tests</CardTitle>\n            <Activity className=\"h-4 w-4 text-muted-foreground\" />\n          </CardHeader>\n          <CardContent>\n            <div className=\"text-2xl font-bold\">{tests.filter(t => t.status === 'running').length}</div>\n            <p className=\"text-xs text-muted-foreground\">Currently running</p>\n          </CardContent>\n        </Card>\n\n        <Card>\n          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">\n            <CardTitle className=\"text-sm font-medium\">Total Participants</CardTitle>\n            <Users className=\"h-4 w-4 text-muted-foreground\" />\n          </CardHeader>\n          <CardContent>\n            <div className=\"text-2xl font-bold\">\n              {tests.reduce((sum, test) => sum + test.participants, 0).toLocaleString()}\n            </div>\n            <p className=\"text-xs text-muted-foreground\">Across all tests</p>\n          </CardContent>\n        </Card>\n\n        <Card>\n          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">\n            <CardTitle className=\"text-sm font-medium\">Avg Conversion Rate</CardTitle>\n            <TrendingUp className=\"h-4 w-4 text-muted-foreground\" />\n          </CardHeader>\n          <CardContent>\n            <div className=\"text-2xl font-bold\">\n              {(tests.reduce((sum, test) => sum + test.conversionRate, 0) / tests.length).toFixed(1)}%\n            </div>\n            <p className=\"text-xs text-muted-foreground\">Across active tests</p>\n          </CardContent>\n        </Card>\n\n        <Card>\n          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">\n            <CardTitle className=\"text-sm font-medium\">Completed Tests</CardTitle>\n            <CheckCircle className=\"h-4 w-4 text-muted-foreground\" />\n          </CardHeader>\n          <CardContent>\n            <div className=\"text-2xl font-bold\">{tests.filter(t => t.status === 'completed').length}</div>\n            <p className=\"text-xs text-muted-foreground\">With results</p>\n          </CardContent>\n        </Card>\n      </div>\n\n      {/* Test List and Details */}\n      <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-6\">\n        {/* Test List */}\n        <Card className=\"lg:col-span-1\">\n          <CardHeader>\n            <CardTitle>Active Tests</CardTitle>\n            <CardDescription>Select a test to view detailed results</CardDescription>\n          </CardHeader>\n          <CardContent>\n            <div className=\"space-y-3\">\n              {tests.map((test) => (\n                <div \n                  key={test.id}\n                  className={cn(\n                    \"p-3 border rounded-lg cursor-pointer transition-colors\",\n                    selectedTest === test.id ? \"border-blue-500 bg-blue-50\" : \"hover:bg-gray-50\"\n                  )}\n                  onClick={() => setSelectedTest(test.id)}\n                >\n                  <div className=\"flex items-center justify-between mb-2\">\n                    <div className=\"flex items-center space-x-2\">\n                      {getStatusIcon(test.status)}\n                      <span className=\"font-medium text-sm\">{test.name}</span>\n                    </div>\n                    <Badge \n                      variant={test.status === 'running' ? 'default' : \n                              test.status === 'completed' ? 'secondary' : 'outline'}\n                    >\n                      {test.status.toUpperCase()}\n                    </Badge>\n                  </div>\n                  \n                  <div className=\"grid grid-cols-2 gap-2 text-xs text-gray-600\">\n                    <div>Participants: {test.participants.toLocaleString()}</div>\n                    <div>Conversion: {test.conversionRate.toFixed(1)}%</div>\n                  </div>\n                  \n                  {test.status === 'running' && (\n                    <div className=\"mt-2 flex space-x-2\">\n                      <Button \n                        size=\"sm\" \n                        variant=\"outline\" \n                        onClick={(e) => {\n                          e.stopPropagation();\n                          handleStopTest(test.id);\n                        }}\n                      >\n                        <Pause className=\"w-3 h-3 mr-1\" />\n                        Stop\n                      </Button>\n                    </div>\n                  )}\n                  \n                  {test.status === 'draft' && (\n                    <div className=\"mt-2\">\n                      <Button \n                        size=\"sm\" \n                        onClick={(e) => {\n                          e.stopPropagation();\n                          handleStartTest(test.id);\n                        }}\n                      >\n                        <Play className=\"w-3 h-3 mr-1\" />\n                        Start\n                      </Button>\n                    </div>\n                  )}\n                </div>\n              ))}\n            </div>\n          </CardContent>\n        </Card>\n\n        {/* Test Results */}\n        <div className=\"lg:col-span-2 space-y-6\">\n          {selectedTestData && testResults ? (\n            <>\n              {/* Test Summary */}\n              <Card>\n                <CardHeader>\n                  <CardTitle>{selectedTestData.name}</CardTitle>\n                  <CardDescription>\n                    Started {new Date(selectedTestData.startDate).toLocaleDateString()} • \n                    {formatDuration(testResults.overallResults.testDuration)} • \n                    {testResults.overallResults.confidence}% confidence\n                  </CardDescription>\n                </CardHeader>\n                <CardContent>\n                  {selectedTestData.status === 'completed' && selectedTestData.winner && (\n                    <Alert className=\"mb-4\">\n                      <CheckCircle className=\"h-4 w-4\" />\n                      <AlertDescription>\n                        Test completed! Winner: {testResults.variants.find(v => v.variantId === selectedTestData.winner)?.name}\n                      </AlertDescription>\n                    </Alert>\n                  )}\n                  \n                  <div className=\"grid grid-cols-3 gap-4 text-center\">\n                    <div>\n                      <div className=\"text-2xl font-bold\">{testResults.overallResults.totalParticipants.toLocaleString()}</div>\n                      <div className=\"text-sm text-gray-600\">Total Participants</div>\n                    </div>\n                    <div>\n                      <div className=\"text-2xl font-bold\">{testResults.overallResults.totalConversions.toLocaleString()}</div>\n                      <div className=\"text-sm text-gray-600\">Total Conversions</div>\n                    </div>\n                    <div>\n                      <div className=\"text-2xl font-bold\">{testResults.overallResults.averageConversionRate.toFixed(1)}%</div>\n                      <div className=\"text-sm text-gray-600\">Avg Conversion Rate</div>\n                    </div>\n                  </div>\n                </CardContent>\n              </Card>\n\n              {/* Variant Performance */}\n              <Card>\n                <CardHeader>\n                  <CardTitle>Variant Performance</CardTitle>\n                  <CardDescription>Conversion rates by variant</CardDescription>\n                </CardHeader>\n                <CardContent>\n                  <ResponsiveContainer width=\"100%\" height={300}>\n                    <BarChart data={testResults.variants}>\n                      <CartesianGrid strokeDasharray=\"3 3\" />\n                      <XAxis dataKey=\"name\" />\n                      <YAxis />\n                      <Tooltip \n                        formatter={(value: number) => [`${value.toFixed(2)}%`, 'Conversion Rate']}\n                      />\n                      <Bar \n                        dataKey=\"conversionRate\" \n                        fill=\"#8884d8\"\n                        name=\"Conversion Rate\"\n                      />\n                    </BarChart>\n                  </ResponsiveContainer>\n                </CardContent>\n              </Card>\n\n              {/* Variant Details */}\n              <Card>\n                <CardHeader>\n                  <CardTitle>Variant Details</CardTitle>\n                  <CardDescription>Detailed statistics for each variant</CardDescription>\n                </CardHeader>\n                <CardContent>\n                  <div className=\"space-y-4\">\n                    {testResults.variants.map((variant) => (\n                      <div key={variant.variantId} className=\"p-4 border rounded-lg\">\n                        <div className=\"flex items-center justify-between mb-3\">\n                          <div className=\"flex items-center space-x-2\">\n                            <span className=\"font-medium\">{variant.name}</span>\n                            {variant.isWinner && (\n                              <Badge variant=\"default\">\n                                <CheckCircle className=\"w-3 h-3 mr-1\" />\n                                Winner\n                              </Badge>\n                            )}\n                            {testResults.variants.find(v => v.variantId === variant.variantId)?.statisticalSignificance && (\n                              <Badge variant=\"secondary\">Significant</Badge>\n                            )}\n                          </div>\n                          <div className=\"text-right\">\n                            <div className=\"text-lg font-bold\">{variant.conversionRate.toFixed(2)}%</div>\n                            <div className=\"text-xs text-gray-500\">\n                              {variant.confidenceInterval.lower.toFixed(1)}% - {variant.confidenceInterval.upper.toFixed(1)}%\n                            </div>\n                          </div>\n                        </div>\n                        \n                        <div className=\"grid grid-cols-2 gap-4 text-sm\">\n                          <div>\n                            <span className=\"text-gray-600\">Participants:</span>\n                            <span className=\"ml-2 font-medium\">{variant.participants.toLocaleString()}</span>\n                          </div>\n                          <div>\n                            <span className=\"text-gray-600\">Conversions:</span>\n                            <span className=\"ml-2 font-medium\">{variant.conversions.toLocaleString()}</span>\n                          </div>\n                        </div>\n                        \n                        <div className=\"mt-3\">\n                          <Progress value={variant.conversionRate} className=\"h-2\" />\n                        </div>\n                      </div>\n                    ))}\n                  </div>\n                </CardContent>\n              </Card>\n            </>\n          ) : (\n            <Card>\n              <CardContent className=\"flex items-center justify-center h-64\">\n                <div className=\"text-center\">\n                  <Eye className=\"w-12 h-12 text-gray-400 mx-auto mb-4\" />\n                  <p className=\"text-gray-600\">Select a test to view detailed results</p>\n                </div>\n              </CardContent>\n            </Card>\n          )}\n        </div>\n      </div>\n    </div>\n  );\n};\n\nexport default ABTestingDashboard;"