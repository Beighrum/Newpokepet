import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowRight, 
  Sparkles, 
  TrendingUp, 
  Eye, 
  Zap,
  Star,
  Crown,
  Loader2
} from 'lucide-react';
import { Card as CardModel } from '@/models/Card';
import { EvolutionPreview as EvolutionPreviewData } from '@/services/cardEvolutionService';
import RarityBadge from '@/components/rarity/RarityBadge';
import { cn } from '@/lib/utils';

interface EvolutionPreviewProps {
  originalCard: CardModel;
  preview: EvolutionPreviewData;
  onConfirm: () => void;
  onCancel: () => void;
  isEvolving?: boolean;
  className?: string;
}

const EvolutionPreview: React.FC<EvolutionPreviewProps> = ({
  originalCard,
  preview,
  onConfirm,
  onCancel,
  isEvolving = false,
  className = ''
}) => {
  const [showComparison, setShowComparison] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);

  // Calculate stat changes
  const statChanges = {
    attack: preview.predictedStats.attack - originalCard.stats.attack,
    defense: preview.predictedStats.defense - originalCard.stats.defense,
    speed: preview.predictedStats.speed - originalCard.stats.speed,
    health: preview.predictedStats.health - originalCard.stats.health,
    totalPower: preview.predictedStats.totalPower - originalCard.stats.totalPower
  };

  const hasRarityUpgrade = preview.predictedRarity !== originalCard.rarity;

  const renderStatChange = (label: string, current: number, predicted: number, change: number) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">{current}</span>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-semibold text-gray-900">{predicted}</span>
        <Badge 
          variant={change > 0 ? 'default' : 'secondary'}
          className={cn(
            'text-xs',
            change > 0 ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
          )}
        >
          {change > 0 ? '+' : ''}{change}
        </Badge>
      </div>
    </div>
  );

  return (
    <div className={cn('max-w-4xl mx-auto', className)}>
      <Card className="border-2 border-purple-200 shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center mb-3">
            <Sparkles className="w-8 h-8 text-purple-600 mr-2" />
            <CardTitle className="text-2xl font-bold text-gray-900">
              Evolution Preview
            </CardTitle>
          </div>
          <CardDescription className="text-lg">
            See how {originalCard.petName} will transform
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Image Comparison */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Original Card */}
            <div className="space-y-3">
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 mb-2">Current Form</h3>
                <RarityBadge rarity={originalCard.rarity} size="sm" />
              </div>
              
              <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={originalCard.image.processedUrl}
                  alt={`${originalCard.petName} - Current`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="text-xs">
                    Current
                  </Badge>
                </div>
              </div>
            </div>

            {/* Evolution Arrow */}
            <div className="hidden md:flex items-center justify-center">
              <div className="flex flex-col items-center space-y-2">
                <ArrowRight className="w-8 h-8 text-purple-600" />
                <span className="text-sm font-medium text-purple-600">Evolves to</span>
              </div>
            </div>

            {/* Evolved Card */}
            <div className="space-y-3">
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 mb-2">Evolved Form</h3>
                <RarityBadge rarity={preview.predictedRarity} size="sm" />
                {hasRarityUpgrade && (
                  <Badge className="ml-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    <Crown className="w-3 h-3 mr-1" />
                    Rarity Upgrade!
                  </Badge>
                )}
              </div>
              
              <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                )}
                <img
                  src={preview.previewImage}
                  alt={`${originalCard.petName} - Evolved`}
                  className={cn(
                    'w-full h-full object-cover transition-opacity duration-200',
                    imageLoading ? 'opacity-0' : 'opacity-100'
                  )}
                  onLoad={() => setImageLoading(false)}
                  onError={() => setImageLoading(false)}
                />
                <div className="absolute top-2 left-2">
                  <Badge className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Evolved
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Enhancement Description */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center mb-2">
              <Eye className="w-5 h-5 text-purple-600 mr-2" />
              <h4 className="font-semibold text-purple-900">Visual Enhancements</h4>
            </div>
            <p className="text-purple-800">{preview.enhancementDescription}</p>
          </div>

          {/* Stats Comparison */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                Stat Improvements
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComparison(!showComparison)}
              >
                {showComparison ? 'Hide' : 'Show'} Details
              </Button>
            </div>

            {showComparison && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-1">
                {renderStatChange('Attack', originalCard.stats.attack, preview.predictedStats.attack, statChanges.attack)}
                {renderStatChange('Defense', originalCard.stats.defense, preview.predictedStats.defense, statChanges.defense)}
                {renderStatChange('Speed', originalCard.stats.speed, preview.predictedStats.speed, statChanges.speed)}
                {renderStatChange('Health', originalCard.stats.health, preview.predictedStats.health, statChanges.health)}
                
                <Separator className="my-3" />
                
                {renderStatChange('Total Power', originalCard.stats.totalPower, preview.predictedStats.totalPower, statChanges.totalPower)}
              </div>
            )}

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{preview.predictedStats.attack}</div>
                <div className="text-xs text-red-600">Attack</div>
                <div className="text-xs text-green-600">+{statChanges.attack}</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{preview.predictedStats.defense}</div>
                <div className="text-xs text-blue-600">Defense</div>
                <div className="text-xs text-green-600">+{statChanges.defense}</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{preview.predictedStats.speed}</div>
                <div className="text-xs text-green-600">Speed</div>
                <div className="text-xs text-green-600">+{statChanges.speed}</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{preview.predictedStats.health}</div>
                <div className="text-xs text-purple-600">Health</div>
                <div className="text-xs text-green-600">+{statChanges.health}</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4 pt-4">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isEvolving}
              className="px-8"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isEvolving}
              className="px-8 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              {isEvolving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Evolving...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Confirm Evolution
                </>
              )}
            </Button>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="text-yellow-600 mr-3 mt-0.5">⚠️</div>
              <div>
                <h5 className="font-medium text-yellow-800 mb-1">Evolution Notice</h5>
                <p className="text-sm text-yellow-700">
                  Evolution is permanent and cannot be undone. The original image will be replaced with the evolved version.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EvolutionPreview;