import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  History, 
  ArrowRight, 
  Calendar, 
  TrendingUp, 
  Crown,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { EvolutionHistory as EvolutionHistoryData } from '@/services/cardEvolutionService';
import RarityBadge from '@/components/rarity/RarityBadge';
import { cn } from '@/lib/utils';

interface EvolutionHistoryProps {
  history: EvolutionHistoryData[];
  className?: string;
  showCardName?: boolean;
  maxItems?: number;
}

const EvolutionHistory: React.FC<EvolutionHistoryProps> = ({
  history,
  className = '',
  showCardName = false,
  maxItems = 10
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const displayedHistory = showAll ? history : history.slice(0, maxItems);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStageNames = (fromStage: number, toStage: number) => {
    const stageNames = ['Base', 'Enhanced', 'Evolved', 'Legendary'];
    return {
      from: stageNames[fromStage] || `Stage ${fromStage}`,
      to: stageNames[toStage] || `Stage ${toStage}`
    };
  };

  if (history.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-12">
          <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Evolution History</h3>
          <p className="text-gray-500">This card hasn't been evolved yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <History className="w-5 h-5 mr-2 text-purple-600" />
          Evolution History
        </CardTitle>
        <CardDescription>
          Track of all evolution transformations ({history.length} total)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {displayedHistory.map((evolution) => {
          const isExpanded = expandedItems.has(evolution.id);
          const stageNames = getStageNames(evolution.fromStage, evolution.toStage);
          const hasRarityChange = evolution.rarityChange;
          const totalStatChange = Object.values(evolution.statsChange).reduce((sum, change) => sum + change, 0);

          return (
            <div
              key={evolution.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
            >
              {/* Evolution Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {stageNames.from}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <Badge className="text-xs bg-purple-500 text-white">
                      {stageNames.to}
                    </Badge>
                  </div>
                  
                  {hasRarityChange && (
                    <Badge className="text-xs bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                      <Crown className="w-3 h-3 mr-1" />
                      Rarity Up!
                    </Badge>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <div className="text-xs text-gray-500 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(evolution.timestamp)}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(evolution.id)}
                    className="h-6 w-6 p-0"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
                  <span>+{totalStatChange} Total Stats</span>
                </div>
                
                {hasRarityChange && (
                  <div className="flex items-center space-x-2">
                    <RarityBadge rarity={hasRarityChange.from} size="sm" />
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                    <RarityBadge rarity={hasRarityChange.to} size="sm" />
                  </div>
                )}
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="space-y-4 pt-3 border-t border-gray-100">
                  {/* Image Comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-700">Before</h5>
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={evolution.originalImage}
                          alt="Original"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-700">After</h5>
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={evolution.evolvedImage}
                          alt="Evolved"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Detailed Stats Changes */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Stat Changes</h5>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Attack:</span>
                        <span className={cn(
                          'font-medium',
                          evolution.statsChange.attack > 0 ? 'text-green-600' : 'text-gray-600'
                        )}>
                          {evolution.statsChange.attack > 0 ? '+' : ''}{evolution.statsChange.attack}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Defense:</span>
                        <span className={cn(
                          'font-medium',
                          evolution.statsChange.defense > 0 ? 'text-green-600' : 'text-gray-600'
                        )}>
                          {evolution.statsChange.defense > 0 ? '+' : ''}{evolution.statsChange.defense}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Speed:</span>
                        <span className={cn(
                          'font-medium',
                          evolution.statsChange.speed > 0 ? 'text-green-600' : 'text-gray-600'
                        )}>
                          {evolution.statsChange.speed > 0 ? '+' : ''}{evolution.statsChange.speed}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Health:</span>
                        <span className={cn(
                          'font-medium',
                          evolution.statsChange.health > 0 ? 'text-green-600' : 'text-gray-600'
                        )}>
                          {evolution.statsChange.health > 0 ? '+' : ''}{evolution.statsChange.health}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Show More Button */}
        {history.length > maxItems && (
          <div className="text-center pt-4">
            <Button
              variant="outline"
              onClick={() => setShowAll(!showAll)}
              className="text-sm"
            >
              {showAll ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Show Less
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Show All ({history.length - maxItems} more)
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EvolutionHistory;