import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Sparkles, 
  Crown, 
  Lock, 
  AlertTriangle,
  Loader2,
  Eye,
  Zap
} from 'lucide-react';
import { Card as CardModel } from '@/models/Card';
import { EvolutionPreview as EvolutionPreviewData } from '@/services/cardEvolutionService';
import { useCardEvolution } from '@/hooks/useCardEvolution';
import { useSubscription } from '@/hooks/useSubscription';
import EvolutionStageIndicator from './EvolutionStageIndicator';
import EvolutionPreview from './EvolutionPreview';
import EvolutionHistory from './EvolutionHistory';
import PremiumGate from '@/components/premium/PremiumGate';
import { cn } from '@/lib/utils';

interface EvolutionPanelProps {
  card: CardModel;
  onCardUpdated?: (updatedCard: CardModel) => void;
  className?: string;
}

const EvolutionPanel: React.FC<EvolutionPanelProps> = ({
  card,
  onCardUpdated,
  className = ''
}) => {
  const { hasFeatureAccess } = useSubscription();
  const {
    isGeneratingPreview,
    isEvolving,
    error,
    currentStage,
    nextStage,
    canEvolve,
    evolutionHistory,
    generatePreview,
    evolveCard,
    clearError
  } = useCardEvolution(card);

  const [preview, setPreview] = useState<EvolutionPreviewData | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const hasEvolutionAccess = hasFeatureAccess('cardEvolution');

  // Handle preview generation
  const handleGeneratePreview = async () => {
    const previewData = await generatePreview(card);
    if (previewData) {
      setPreview(previewData);
    }
  };

  // Handle evolution confirmation
  const handleConfirmEvolution = async () => {
    const evolvedCard = await evolveCard(card);
    if (evolvedCard) {
      setPreview(null);
      onCardUpdated?.(evolvedCard);
    }
  };

  // Handle preview cancellation
  const handleCancelPreview = () => {
    setPreview(null);
    clearError();
  };

  // If showing preview, render preview component
  if (preview) {
    return (
      <EvolutionPreview
        originalCard={card}
        preview={preview}
        onConfirm={handleConfirmEvolution}
        onCancel={handleCancelPreview}
        isEvolving={isEvolving}
        className={className}
      />
    );
  }

  // Main evolution panel content
  const evolutionContent = (
    <div className={cn('space-y-6', className)}>
      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="ml-2 h-auto p-0 text-red-600 hover:text-red-700"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Evolution Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
            Evolution Status
          </CardTitle>
          <CardDescription>
            Track {card.petName}'s evolution progress and unlock new forms
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Stage Indicator */}
          {currentStage && (
            <EvolutionStageIndicator
              stages={[
                { id: 'base', name: 'Base', description: 'Original form', requiredLevel: 0, rarityBoost: false, statMultiplier: 1.0, visualEnhancements: [] },
                { id: 'enhanced', name: 'Enhanced', description: 'Improved quality', requiredLevel: 1, rarityBoost: false, statMultiplier: 1.15, visualEnhancements: [] },
                { id: 'evolved', name: 'Evolved', description: 'Major transformation', requiredLevel: 2, rarityBoost: true, statMultiplier: 1.35, visualEnhancements: [] },
                { id: 'legendary', name: 'Legendary', description: 'Ultimate form', requiredLevel: 3, rarityBoost: true, statMultiplier: 1.6, visualEnhancements: [] }
              ]}
              currentStage={card.evolution?.currentStage || 0}
              maxStage={3}
              showLabels={true}
            />
          )}

          {/* Evolution Actions */}
          <div className="space-y-4">
            {canEvolve && nextStage ? (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-purple-900">Ready to Evolve!</h4>
                    <p className="text-sm text-purple-700">
                      {card.petName} can evolve to {nextStage.name}
                    </p>
                  </div>
                  <Crown className="w-8 h-8 text-purple-600" />
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    onClick={handleGeneratePreview}
                    disabled={isGeneratingPreview}
                    variant="outline"
                    className="flex-1"
                  >
                    {isGeneratingPreview ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Preview Evolution
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleConfirmEvolution}
                    disabled={isEvolving}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {isEvolving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Evolving...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Evolve Now
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : !canEvolve && nextStage ? (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-700 flex items-center">
                      <Lock className="w-4 h-4 mr-2" />
                      Evolution Locked
                    </h4>
                    <p className="text-sm text-gray-600">
                      Premium subscription required to evolve cards
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="flex items-center">
                  <Crown className="w-5 h-5 text-yellow-600 mr-3" />
                  <div>
                    <h4 className="font-semibold text-yellow-800">Maximum Evolution Reached</h4>
                    <p className="text-sm text-yellow-700">
                      {card.petName} has reached its final form!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Evolution Stats */}
          {card.evolution && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Evolution Statistics</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Current Stage:</span>
                  <span className="ml-2 font-medium">{currentStage?.name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Evolutions:</span>
                  <span className="ml-2 font-medium">{card.evolution.totalEvolutions}</span>
                </div>
                <div>
                  <span className="text-gray-600">Stage Progress:</span>
                  <span className="ml-2 font-medium">
                    {card.evolution.currentStage + 1}/{card.evolution.maxStage + 1}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">History Entries:</span>
                  <span className="ml-2 font-medium">{evolutionHistory.length}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evolution History */}
      {evolutionHistory.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Evolution History</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? 'Hide' : 'Show'} History
            </Button>
          </div>
          
          {showHistory && (
            <EvolutionHistory
              history={evolutionHistory}
              showCardName={false}
            />
          )}
        </div>
      )}
    </div>
  );

  // Wrap in premium gate if user doesn't have access
  if (!hasEvolutionAccess) {
    return (
      <PremiumGate
        feature="card_evolution"
        requiredTier="premium"
        title="Card Evolution"
        description="Transform your cards into enhanced versions with advanced AI"
        className={className}
      >
        {evolutionContent}
      </PremiumGate>
    );
  }

  return evolutionContent;
};

export default EvolutionPanel;