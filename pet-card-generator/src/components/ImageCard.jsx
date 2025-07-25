import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Heart, 
  Zap, 
  Shield, 
  Brain, 
  Gamepad2,
  Star,
  Sparkles,
  Download,
  Share2,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { SafeHTMLDisplay } from './sanitization/SafeHTMLDisplay';
import { PetCardSafeDisplay } from './sanitization/PetCardSafeDisplay';
import { socialSharingService } from '../services/socialSharingService';
import { petCardSanitizationService } from '../services/petCardSanitization';
import SecurityStatusIndicator from './SecurityStatusIndicator';

// Rarity color mappings
const RARITY_COLORS = {
  Common: 'bg-gray-500',
  Uncommon: 'bg-green-500',
  Rare: 'bg-blue-500',
  Epic: 'bg-purple-500',
  Legendary: 'bg-yellow-500'
};

// Rarity text colors
const RARITY_TEXT_COLORS = {
  Common: 'text-gray-700',
  Uncommon: 'text-green-700',
  Rare: 'text-blue-700',
  Epic: 'text-purple-700',
  Legendary: 'text-yellow-700'
};

// Stat icon mappings
const STAT_ICONS = {
  cuteness: Heart,
  energy: Zap,
  loyalty: Shield,
  intelligence: Brain,
  playfulness: Gamepad2
};

// Stat display names
const STAT_NAMES = {
  cuteness: 'Cuteness',
  energy: 'Energy',
  loyalty: 'Loyalty',
  intelligence: 'Intelligence',
  playfulness: 'Playfulness'
};

const ImageCard = ({ 
  card, 
  onClick, 
  onShare, 
  onDownload,
  showStats = true,
  showActions = true,
  className = '',
  size = 'default' // 'small', 'default', 'large'
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  if (!card) {
    return null;
  }

  const {
    id,
    petName = 'Unknown Pet',
    petType = 'Pet',
    rarity = 'Common',
    stats = {},
    images = {},
    evolution = {},
    createdAt,
    metadata = {},
    sanitizationInfo = {}
  } = card;

  const imageUrl = images.processed || images.original || '/placeholder-pet.jpg';
  const rarityColor = RARITY_COLORS[rarity] || RARITY_COLORS.Common;
  const rarityTextColor = RARITY_TEXT_COLORS[rarity] || RARITY_TEXT_COLORS.Common;

  // Calculate size classes
  const sizeClasses = {
    small: 'w-48',
    default: 'w-64',
    large: 'w-80'
  };

  const imageSizeClasses = {
    small: 'h-32',
    default: 'h-48',
    large: 'h-64'
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(card);
    } else {
      setIsDetailModalOpen(true);
    }
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    if (onShare) {
      onShare(card);
    } else {
      try {
        // Generate sanitized sharing metadata using sanitized card data
        const sanitizedCardData = await petCardSanitizationService.sanitizeCardForSharing(card);
        const shareMetadata = await socialSharingService.generateSanitizedShareMetadata(
          sanitizedCardData.petName,
          sanitizedCardData.petType,
          rarity,
          sanitizedCardData.description,
          imageUrl,
          sanitizedCardData.customTags
        );

        // Log sharing activity for security monitoring
        await socialSharingService.logSharingActivity(
          shareMetadata,
          'web_share_api',
          card.userId
        );

        // Try Web Share API first
        const webShareSuccess = await socialSharingService.shareWithWebAPI(shareMetadata);
        
        if (!webShareSuccess) {
          // Fallback: copy to clipboard
          const clipboardSuccess = await socialSharingService.copyToClipboard(shareMetadata);
          
          if (clipboardSuccess) {
            // You could show a toast notification here
            console.log('Share content copied to clipboard');
          } else {
            // Final fallback: just copy URL
            await navigator.clipboard.writeText(shareMetadata.url);
          }
        }
      } catch (error) {
        console.error('Error sharing card:', error);
        // Fallback to simple URL sharing
        try {
          await navigator.clipboard.writeText(window.location.href);
        } catch (clipboardError) {
          console.error('Clipboard fallback failed:', clipboardError);
        }
      }
    }
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload(card);
    } else {
      // Default download functionality
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `${petName}-${rarity}-card.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderStats = () => {
    if (!showStats || !stats || Object.keys(stats).length === 0) {
      return null;
    }

    return (
      <div className="space-y-2">
        {Object.entries(stats).map(([statKey, value]) => {
          const Icon = STAT_ICONS[statKey];
          const statName = STAT_NAMES[statKey] || statKey;
          
          if (!Icon) return null;

          return (
            <div key={statKey} className="flex items-center space-x-2">
              <Icon className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700 flex-1">
                {statName}
              </span>
              <div className="flex items-center space-x-2 flex-1">
                <Progress value={value} className="flex-1" />
                <span className="text-sm font-bold text-gray-900 w-8 text-right">
                  {value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderEvolutionInfo = () => {
    if (!evolution || !evolution.stage) {
      return null;
    }

    const { stage, maxStage, canEvolve } = evolution;

    return (
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-1">
          <Star className="w-4 h-4 text-yellow-500" />
          <span className="text-gray-600">
            Stage {stage}/{maxStage}
          </span>
        </div>
        {canEvolve && (
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            Can Evolve
          </Badge>
        )}
      </div>
    );
  };

  return (
    <>
      <Card 
        className={`${sizeClasses[size]} cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${className}`}
        onClick={handleCardClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold truncate">
              <PetCardSafeDisplay 
                card={card}
                field="petName"
                className="inline"
                fallback={petName}
              />
            </CardTitle>
            <div className="flex items-center space-x-1">
              <Badge className={`${rarityColor} text-white`}>
                {rarity}
              </Badge>
              {sanitizationInfo && (
                <SecurityStatusIndicator
                  contentType="pet_card_metadata"
                  sanitizationInfo={sanitizationInfo}
                  size="sm"
                  showDetails={true}
                />
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600">
            <PetCardSafeDisplay 
              card={card}
              field="petType"
              className="inline"
              fallback={petType}
            />
          </p>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Pet Image */}
          <div className={`relative ${imageSizeClasses[size]} bg-gray-100 rounded-lg overflow-hidden`}>
            {!imageError ? (
              <img
                src={imageUrl}
                alt={`${petName} - ${rarity} card`}
                className="w-full h-full object-cover"
                loading="lazy"
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageError(true);
                  setImageLoading(false);
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Heart className="w-8 h-8" />
              </div>
            )}
            
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {/* Rarity overlay */}
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${rarityColor} shadow-lg`}></div>
          </div>

          {/* Evolution Info */}
          {renderEvolutionInfo()}

          {/* Stats */}
          {size !== 'small' && renderStats()}

          {/* Actions */}
          {showActions && size !== 'small' && (
            <div className="flex space-x-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="flex-1"
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <PetCardSafeDisplay 
                card={card}
                field="petName"
                fallback={petName}
              />
              <Badge className={`${rarityColor} text-white`}>
                {rarity}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              <PetCardSafeDisplay 
                card={card}
                field="petType"
                fallback={petType}
              /> • Created {createdAt ? new Date(createdAt.toDate()).toLocaleDateString() : 'Recently'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image */}
            <div className="space-y-4">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={imageUrl}
                  alt={`${petName} - ${rarity} card`}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button onClick={handleShare} className="flex-1">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button onClick={handleDownload} variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4">
              {renderEvolutionInfo()}
              
              <div>
                <h4 className="font-semibold mb-3">Stats</h4>
                {renderStats()}
              </div>

              {evolution?.canEvolve && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-900">Ready to Evolve!</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    This card meets the requirements for evolution to the next stage.
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImageCard;
