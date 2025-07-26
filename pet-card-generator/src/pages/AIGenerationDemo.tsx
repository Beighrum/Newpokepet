import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Wand2, 
  Zap, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Image as ImageIcon,
  Settings,
  Wifi,
  WifiOff
} from 'lucide-react';
import AIGenerationPanel from '@/components/ai/AIGenerationPanel';
import { useAIGeneration } from '@/hooks/useAIGeneration';
import { GENERATION_STYLES } from '@/services/aiImageGeneration';

const AIGenerationDemo: React.FC = () => {
  const {
    isGenerating,
    currentGeneration,
    progress,
    error,
    history,
    availableStyles,
    testConnection,
    clearError,
    clearHistory
  } = useAIGeneration();

  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Test API connection
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const connected = await testConnection();
      setConnectionStatus(connected ? 'connected' : 'disconnected');
    } catch (error) {
      setConnectionStatus('disconnected');
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Handle generation completion
  const handleGenerationComplete = (imageUrl: string, metadata: any) => {
    console.log('Generation completed:', { imageUrl, metadata });
  };

  // Handle generation start
  const handleGenerationStart = () => {
    console.log('Generation started');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🤖 AI Pet Card Generation Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Experience the power of AI-driven pet card generation. Upload your pet's photo, 
            choose a style, and watch as advanced AI transforms it into a stunning card with 
            progress tracking and fallback mechanisms.
          </p>
        </div>

        {/* Connection Status & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {connectionStatus === 'connected' ? (
                  <Wifi className="w-5 h-5 mr-2 text-green-500" />
                ) : connectionStatus === 'disconnected' ? (
                  <WifiOff className="w-5 h-5 mr-2 text-red-500" />
                ) : (
                  <Settings className="w-5 h-5 mr-2 text-gray-500" />
                )}
                API Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge 
                  variant={
                    connectionStatus === 'connected' ? 'default' : 
                    connectionStatus === 'disconnected' ? 'destructive' : 
                    'secondary'
                  }
                >
                  {connectionStatus === 'connected' ? 'Connected' : 
                   connectionStatus === 'disconnected' ? 'Disconnected' : 
                   'Unknown'}
                </Badge>
              </div>
              
              <Button
                onClick={handleTestConnection}
                disabled={isTestingConnection}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {isTestingConnection ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>

              {connectionStatus === 'disconnected' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    API connection failed. Demo will use mock responses.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ImageIcon className="w-5 h-5 mr-2 text-blue-500" />
                Generation Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {history.length}
                  </div>
                  <div className="text-gray-600">Total Generated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {history.filter(h => h.status === 'completed').length}
                  </div>
                  <div className="text-gray-600">Successful</div>
                </div>
              </div>

              {history.length > 0 && (
                <Button
                  onClick={clearHistory}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Clear History
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2 text-orange-500" />
                Current Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isGenerating ? (
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500 mr-2" />
                    <span className="text-sm font-medium">Generating...</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {progress?.message || 'Processing your request...'}
                  </div>
                  <div className="text-xs text-gray-500">
                    Progress: {progress?.progress || 0}%
                  </div>
                </div>
              ) : currentGeneration?.status === 'completed' ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span className="text-sm">Generation Complete</span>
                </div>
              ) : error ? (
                <div className="space-y-2">
                  <div className="flex items-center text-red-600">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    <span className="text-sm">Error Occurred</span>
                  </div>
                  <Button
                    onClick={clearError}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Clear Error
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Ready to generate
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Available Styles */}
        <Card>
          <CardHeader>
            <CardTitle>Available Generation Styles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {availableStyles.map((style) => (
                <div 
                  key={style.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-white"
                >
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">{style.displayName}</h3>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {style.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Steps: {style.parameters.num_inference_steps}</span>
                      <span>Size: {style.parameters.width}x{style.parameters.height}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Generation Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AIGenerationPanel
            onGenerationComplete={handleGenerationComplete}
            onGenerationStart={handleGenerationStart}
          />

          {/* Generation History */}
          <Card>
            <CardHeader>
              <CardTitle>Generation History</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No generations yet. Create your first AI pet card!</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {history.map((generation, index) => (
                    <div 
                      key={generation.id}
                      className="flex items-center space-x-3 p-3 border rounded-lg"
                    >
                      {generation.imageUrl && generation.status === 'completed' ? (
                        <img
                          src={generation.imageUrl}
                          alt="Generated pet card"
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={
                              generation.status === 'completed' ? 'default' :
                              generation.status === 'failed' ? 'destructive' :
                              'secondary'
                            }
                            className="text-xs"
                          >
                            {generation.status}
                          </Badge>
                          <span className="text-sm font-medium truncate">
                            {generation.metadata?.petName || 'Pet'} - {generation.metadata?.style}
                          </span>
                        </div>
                        
                        {generation.error && (
                          <p className="text-xs text-red-600 mt-1 truncate">
                            {generation.error}
                          </p>
                        )}
                        
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(generation.metadata?.generationTime || Date.now()).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Technical Details */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Implementation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div>
                <h4 className="font-semibold mb-2">🔄 Retry Logic</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Exponential backoff</li>
                  <li>• Max 3 retry attempts</li>
                  <li>• Graceful error handling</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">📊 Progress Tracking</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Real-time updates</li>
                  <li>• Status messages</li>
                  <li>• Percentage completion</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">🛡️ Fallback Mechanisms</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Mock responses</li>
                  <li>• Error boundaries</li>
                  <li>• Graceful degradation</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">🔧 N8N Integration</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Workflow triggers</li>
                  <li>• Status polling</li>
                  <li>• Webhook support</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AIGenerationDemo;