import React, { useState, useCallback, useMemo } from 'react';
import { Card as CardModel } from '@/models/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Share2, 
  Download, 
  MoreVertical, 
  Eye,
  Trash2,
  Edit,
  Star
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import RarityBadge from '@/components/rarity/RarityBadge';
import { cn } from '@/lib/utils';

interface CardGridProps {
  cards: CardModel[];
  loading?: boolean;
  onCardClick?: (card: CardModel) => void;
  onCardFavorite?: (cardId: string, isFavorite: boolean) => void;
  onCardShare?: (card: CardModel) => void;
  onCardDownload?: (card: CardModel) => void;
  onCardEdit?: (card: CardModel) => void;
  onCardDelete?: (card: CardModel) => void;
  onCardView?: (card: CardModel) => void;
  className?: string;
  gridCols?: 2 | 3 | 4 | 5 | 6;
  showActions?: boolean;
  selectable?: boolean;
  selectedCards?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
}

const CardGrid: React.FC<CardGridProps> = ({
  cards,
  loading = false,
  onCardClick,
  onCardFavorite,
  onCardShare,
  onCardDownload,
  onCardEdit,
  onCardDelete,
  onCardView,
  className = '',
  gridCols = 4,
  showActions = true,
  selectable = false,
  selectedCards = [],
  onSelectionChange
}) => {
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
  const [imageLoading, setImageLoading] = useState<Set<string>>(new Set());

  // Grid column classes
  const gridColsClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6'
  }[gridCols];

  // Handle image load error
  const handleImageError = useCallback((cardId: string) => {
    setImageLoadErrors(prev => new Set([...prev, cardId]));
    setImageLoading(prev => {
      const newSet = new Set(prev);
      newSet.delete(cardId);
      return newSet;
    });
  }, []);

  // Handle image load start
  const handleImageLoadStart = useCallback((cardId: string) => {
    setImageLoading(prev => new Set([...prev, cardId]));
  }, []);

  // Handle image load success
  const handleImageLoadSuccess = useCallback((cardId: string) => {
    setImageLoading(prev => {
      const newSet = new Set(prev);
      newSet.delete(cardId);
      return newSet;
    });
  }, []);

  // Handle card selection
  const handleCardSelection = useCallback((cardId: string, selected: boolean) => {
    if (!selectable || !onSelectionChange) return;
    
    const newSelection = selected 
      ? [...selectedCards, cardId]
      : selectedCards.filter(id => id !== cardId);
    
    onSelectionChange(newSelection);
  }, [selectable, selectedCards, onSelectionChange]);

  // Handle favorite toggle
  const handleFavoriteToggle = useCallback((e: React.MouseEvent, card: CardModel) => {
    e.stopPropagation();
    onCardFavorite?.(card.id, !card.isFavorite);
  }, [onCardFavorite]);

  if (loading) {
    return (
      <div className={cn('grid gap-4', gridColsClass)}>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="aspect-square bg-gray-200 animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-1/4 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎴</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No cards found</h3>
        <p className="text-gray-500">Start creating some amazing pet cards!</p>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4', gridColsClass)}>
      {cards.map((card) => {
        const isSelected = selectedCards.includes(card.id);
        const hasImageError = imageLoadErrors.has(card.id);
        const isImageLoading = imageLoading.has(card.id);
        
        return (
          <div
            key={card.id}
            className={cn(
              'group relative bg-white rounded-lg shadow-sm border transition-all duration-200',
              'hover:shadow-md hover:scale-[1.02] cursor-pointer',
              isSelected && 'ring-2 ring-blue-500 ring-offset-2',
              className
            )}
            onClick={() => onCardClick?.(card)}
          >
            {/* Selection checkbox */}
            {selectable && (
              <div className="absolute top-2 left-2 z-10">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleCardSelection(card.id, e.target.checked);
                  }}
                  className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
            )}

            {/* Card Image */}
            <div className="relative aspect-square overflow-hidden rounded-t-lg bg-gray-100">
              {isImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600" />
                </div>
              )}
              
              {hasImageError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
                  <div className="text-center">
                    <div className="text-2xl mb-2">🖼️</div>
                    <div className="text-sm">Image not available</div>
                  </div>
                </div>
              ) : (
                <img
                  src={card.image.processedUrl}
                  alt={`${card.petName} - ${card.petType}`}
                  className={cn(
                    'w-full h-full object-cover transition-opacity duration-200',
                    isImageLoading ? 'opacity-0' : 'opacity-100'
                  )}
                  loading="lazy"
                  onLoadStart={() => handleImageLoadStart(card.id)}
                  onLoad={() => handleImageLoadSuccess(card.id)}
                  onError={() => handleImageError(card.id)}
                />
              )}

              {/* Rarity Badge */}
              <div className="absolute top-2 right-2">
                <RarityBadge 
                  rarity={card.rarity} 
                  size="sm" 
                  showGlow={true}
                />
              </div>

              {/* Favorite Button */}
              <button
                onClick={(e) => handleFavoriteToggle(e, card)}
                className={cn(
                  'absolute bottom-2 right-2 p-1.5 rounded-full transition-all duration-200',
                  'bg-white/80 backdrop-blur-sm hover:bg-white',
                  'opacity-0 group-hover:opacity-100',
                  card.isFavorite && 'opacity-100 text-red-500'
                )}
              >
                <Heart 
                  className={cn(
                    'w-4 h-4 transition-colors',
                    card.isFavorite ? 'fill-current text-red-500' : 'text-gray-600 hover:text-red-500'
                  )}
                />
              </button>

              {/* Animation indicator */}
              {card.animation?.enabled && (
                <div className="absolute bottom-2 left-2">
                  <Badge variant="secondary" className="text-xs">
                    GIF
                  </Badge>
                </div>
              )}
            </div>

            {/* Card Info */}
            <div className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {card.petName}
                  </h3>
                  <p className="text-sm text-gray-500 capitalize truncate">
                    {card.petType}
                  </p>
                </div>
                
                {showActions && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onCardView && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onCardView(card);
                        }}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                      )}
                      {onCardEdit && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onCardEdit(card);
                        }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Card
                        </DropdownMenuItem>
                      )}
                      {onCardShare && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onCardShare(card);
                        }}>
                          <Share2 className="mr-2 h-4 w-4" />
                          Share
                        </DropdownMenuItem>
                      )}
                      {onCardDownload && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onCardDownload(card);
                        }}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                      )}
                      {onCardDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              onCardDelete(card);
                            }}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Card Stats */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center">
                    <Star className="w-3 h-3 mr-1" />
                    {card.stats.totalPower}
                  </span>
                  <span className="flex items-center">
                    <Share2 className="w-3 h-3 mr-1" />
                    {card.shareCount}
                  </span>
                  <span className="flex items-center">
                    <Download className="w-3 h-3 mr-1" />
                    {card.downloadCount}
                  </span>
                </div>
                
                <span>
                  {new Date(card.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Tags */}
              {card.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {card.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {card.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{card.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CardGrid;