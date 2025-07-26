import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Star, 
  Sparkles, 
  Crown, 
  Zap,
  Lock,
  Check
} from 'lucide-react';
import { EvolutionStage } from '@/services/cardEvolutionService';
import { cn } from '@/lib/utils';

interface EvolutionStageIndicatorProps {
  stages: EvolutionStage[];
  currentStage: number;
  maxStage: number;
  className?: string;
  showLabels?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

const STAGE_ICONS = {
  0: Star,
  1: Sparkles,
  2: Crown,
  3: Zap
};

const STAGE_COLORS = {
  0: 'text-gray-500 bg-gray-100',
  1: 'text-blue-500 bg-blue-100',
  2: 'text-purple-500 bg-purple-100',
  3: 'text-yellow-500 bg-yellow-100'
};

const EvolutionStageIndicator: React.FC<EvolutionStageIndicatorProps> = ({
  stages,
  currentStage,
  maxStage,
  className = '',
  showLabels = true,
  orientation = 'horizontal'
}) => {
  const progress = ((currentStage + 1) / (maxStage + 1)) * 100;

  const renderStage = (stage: EvolutionStage, index: number) => {
    const Icon = STAGE_ICONS[index as keyof typeof STAGE_ICONS] || Star;
    const isCompleted = index <= currentStage;
    const isCurrent = index === currentStage;
    const isLocked = index > currentStage + 1;

    return (
      <div
        key={stage.id}
        className={cn(
          'flex items-center',
          orientation === 'vertical' ? 'flex-col space-y-2' : 'flex-col space-y-1'
        )}
      >
        {/* Stage Icon */}
        <div
          className={cn(
            'relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200',
            isCompleted
              ? 'border-green-500 bg-green-100 text-green-600'
              : isCurrent
              ? `border-blue-500 bg-blue-100 text-blue-600 ring-2 ring-blue-200`
              : isLocked
              ? 'border-gray-300 bg-gray-50 text-gray-400'
              : 'border-gray-400 bg-gray-100 text-gray-500'
          )}
        >
          {isCompleted && index < currentStage ? (
            <Check className="w-6 h-6" />
          ) : isLocked ? (
            <Lock className="w-5 h-5" />
          ) : (
            <Icon className="w-6 h-6" />
          )}
          
          {/* Current stage pulse effect */}
          {isCurrent && (
            <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-pulse" />
          )}
        </div>

        {/* Stage Info */}
        {showLabels && (
          <div className="text-center">
            <div className={cn(
              'text-sm font-medium',
              isCompleted ? 'text-green-600' : 
              isCurrent ? 'text-blue-600' : 
              'text-gray-500'
            )}>
              {stage.name}
            </div>
            <div className="text-xs text-gray-500 max-w-20 leading-tight">
              {stage.description}
            </div>
          </div>
        )}

        {/* Stage Badge */}
        <Badge
          variant={isCompleted ? 'default' : isCurrent ? 'secondary' : 'outline'}
          className={cn(
            'text-xs',
            isCompleted && 'bg-green-500 text-white',
            isCurrent && 'bg-blue-500 text-white'
          )}
        >
          Stage {index + 1}
        </Badge>
      </div>
    );
  };

  if (orientation === 'vertical') {
    return (
      <div className={cn('space-y-6', className)}>
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Evolution Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Stages */}
        <div className="space-y-8">
          {stages.map((stage, index) => renderStage(stage, index))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Evolution Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Stages */}
      <div className="flex justify-between items-start space-x-4">
        {stages.map((stage, index) => (
          <div key={stage.id} className="flex-1">
            {renderStage(stage, index)}
            
            {/* Connection Line */}
            {index < stages.length - 1 && (
              <div className="flex justify-center mt-4">
                <div
                  className={cn(
                    'h-0.5 w-full',
                    index < currentStage ? 'bg-green-500' : 'bg-gray-300'
                  )}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Stage Details */}
      {showLabels && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">
            Current Stage: {stages[currentStage]?.name}
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            {stages[currentStage]?.description}
          </p>
          
          {/* Stage Benefits */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-700">Stage Benefits:</div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                {(stages[currentStage]?.statMultiplier * 100 - 100).toFixed(0)}% Stat Boost
              </Badge>
              {stages[currentStage]?.rarityBoost && (
                <Badge variant="outline" className="text-xs">
                  Rarity Upgrade
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {stages[currentStage]?.visualEnhancements.length} Visual Effects
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvolutionStageIndicator;