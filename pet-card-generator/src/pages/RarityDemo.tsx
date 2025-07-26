import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dice6, Sparkles, BarChart3 } from 'lucide-react';
import RarityBadge from '@/components/rarity/RarityBadge';
import RarityCelebration from '@/components/rarity/RarityCelebration';
import RarityDistribution from '@/components/rarity/RarityDistribution';
import { raritySystem, RarityLevel } from '@/services/raritySystem';

const RarityDemo: React.FC = () => {
  const [showCelebration, setShowCelebration] = useState(false);
  const [currentRarity, setCurrentRarity] = useState<RarityLevel>('common');
  const [generatedRarities, setGeneratedRarities] = useState<RarityLevel[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateRarity = async () => {
    setIsGenerating(true);
    
    // Add a small delay for effect
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const rarity = raritySystem.generateRarity();
    setCurrentRarity(rarity);
    setGeneratedRarities(prev => [...prev, rarity]);
    
    // Show celebration for rare cards
    if (raritySystem.isRareOrAbove(rarity)) {
      setShowCelebration(true);
    }
    
    setIsGenerating(false);
  };

  const generateMultiple = async () => {
    setIsGenerating(true);
    
    const newRarities: RarityLevel[] = [];
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const rarity = raritySystem.generateRarity(`batch-${Date.now()}-${i}`);
      newRarities.push(rarity);
    }
    
    setGeneratedRarities(prev => [...prev, ...newRarities]);
    setCurrentRarity(newRarities[newRarities.length - 1]);
    
    // Show celebration for the last rare card
    const lastRare = newRarities.reverse().find(r => raritySystem.isRareOrAbove(r));
    if (lastRare) {
      setCurrentRarity(lastRare);
      setShowCelebration(true);
    }
    
    setIsGenerating(false);
  };

  const clearHistory = () => {
    setGeneratedRarities([]);
    setCurrentRarity('common');
  };

  const actualDistribution = React.useMemo(() => {
    if (generatedRarities.length === 0) return undefined;
    
    const analysis = raritySystem.analyzeDistribution(generatedRarities);
    return analysis.percentages;
  }, [generatedRarities]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎲 Pet Card Rarity System Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Experience the thrill of generating rare pet cards! Test the weighted randomization 
            algorithm and see the celebration animations for epic discoveries.
          </p>
        </div>

        {/* Current Generation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Generator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Dice6 className="w-5 h-5 mr-2 text-blue-500" />
                Rarity Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Result */}
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Latest Generation</h3>
                  <RarityBadge 
                    rarity={currentRarity} 
                    size="lg" 
                    showEffects={true}
                    animated={true}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <div className="font-medium">Multiplier</div>
                    <div>{raritySystem.getRarityMultiplier(currentRarity)}x</div>
                  </div>
                  <div>
                    <div className="font-medium">Tier</div>
                    <div>{raritySystem.getRarityTier(currentRarity)}/5</div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-3">
                <Button 
                  onClick={generateRarity}
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Single Card
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={generateMultiple}
                  disabled={isGenerating}
                  variant="outline"
                  className="w-full"
                >
                  Generate 10 Cards
                </Button>
                
                {generatedRarities.length > 0 && (
                  <Button 
                    onClick={clearHistory}
                    variant="destructive"
                    className="w-full"
                    size="sm"
                  >
                    Clear History ({generatedRarities.length} cards)
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-green-500" />
                Recent Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {generatedRarities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Dice6 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Generate some cards to see results!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Last 10 results */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Last 10 Generations</h4>
                    <div className="flex flex-wrap gap-2">
                      {generatedRarities.slice(-10).map((rarity, index) => (
                        <RarityBadge 
                          key={`${rarity}-${index}`}
                          rarity={rarity} 
                          size="sm"
                          showGlow={raritySystem.isRareOrAbove(rarity)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {generatedRarities.length}
                      </div>
                      <div className="text-sm text-gray-600">Total Generated</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {generatedRarities.filter(r => raritySystem.isRareOrAbove(r)).length}
                      </div>
                      <div className="text-sm text-gray-600">Epic+ Cards</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Distribution Analysis */}
        {generatedRarities.length > 0 && (
          <RarityDistribution 
            actualDistribution={actualDistribution}
            sampleSize={generatedRarities.length}
            showExpected={true}
            showComparison={true}
          />
        )}

        {/* All Rarity Types */}
        <Card>
          <CardHeader>
            <CardTitle>All Rarity Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(raritySystem.getAllRarityConfigs()).map(([rarity, config]) => (
                <div 
                  key={rarity}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                  style={{ borderColor: config.borderColor }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <RarityBadge rarity={rarity as RarityLevel} size="sm" />
                    <span className="text-sm text-gray-500">{config.weight}%</span>
                  </div>
                  <p className="text-sm text-gray-600">{config.description}</p>
                  <div className="mt-2 text-xs text-gray-500">
                    Multiplier: {raritySystem.getRarityMultiplier(rarity as RarityLevel)}x
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Celebration Modal */}
      {showCelebration && (
        <RarityCelebration
          rarity={currentRarity}
          petName="Demo Pet"
          onClose={() => setShowCelebration(false)}
          autoClose={true}
          autoCloseDelay={3000}
        />
      )}
    </div>
  );
};

export default RarityDemo;