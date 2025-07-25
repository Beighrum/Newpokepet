/**
 * PetCardSafeDisplay component for safely displaying pet card metadata
 */

import React, { useMemo, useCallback } from 'react';
import { SafeHTMLDisplay } from './SafeHTMLDisplay';
import { useSanitizedContent } from '../../hooks/useSanitizedContent';
import {
  PetCardSafeDisplayProps,
  ContentError,
  ContentType,
  PetCard
} from '../../types/sanitization';

// Fallback component for pet card content errors
const PetCardErrorFallback: React.FC<{ error?: string }> = ({ error }) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
    <div className="flex items-center text-red-800">
      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <span className="font-medium">Pet Card Unavailable</span>
    </div>
    <p className="mt-1 text-sm text-red-600">
      {error || 'This pet card cannot be displayed safely due to content issues.'}
    </p>
  </div>
);

// Loading placeholder for pet card
const PetCardLoadingPlaceholder: React.FC = () => (
  <div className="animate-pulse">
    <div className="bg-gray-200 rounded-lg h-48 mb-4"></div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>
  </div>
);

export const PetCardSafeDisplay: React.FC<PetCardSafeDisplayProps> = ({
  card,
  showMetadata = true,
  onContentError,
  sanitizationOptions,
  className = '',
  ...props
}) => {
  const { sanitize, error: sanitizationError } = useSanitizedContent({
    contentType: ContentType.PET_CARD_METADATA,
    enableMemoization: true
  });

  // Handle content errors
  const handleContentError = useCallback((error: Error) => {
    const contentError: ContentError = {
      ...error,
      name: 'ContentError',
      type: 'render_failed',
      contentType: ContentType.PET_CARD_METADATA,
      originalContent: JSON.stringify(card)
    };
    
    console.error('PetCardSafeDisplay error:', contentError);
    
    if (onContentError) {
      onContentError(contentError);
    }
  }, [card, onContentError]);

  // Sanitize pet card data
  const sanitizedCard = useMemo(() => {
    if (!card) return null;

    try {
      const allowedTags = ['strong', 'em', 'span', 'br'];
      
      return {
        ...card,
        petName: sanitize(card.petName || '', { 
          allowedTags: [], // Pet names should be plain text
          ...sanitizationOptions 
        }),
        petType: sanitize(card.petType || '', { 
          allowedTags: [],
          ...sanitizationOptions 
        }),
        rarity: sanitize(card.rarity || '', { 
          allowedTags: [],
          ...sanitizationOptions 
        }),
        // If card has additional metadata fields, sanitize them
        ...(card.metadata && {
          metadata: {
            ...card.metadata,
            breed: sanitize(card.metadata.breed || '', { 
              allowedTags: [],
              ...sanitizationOptions 
            }),
            description: card.metadata.description ? sanitize(card.metadata.description, { 
              allowedTags,
              ...sanitizationOptions 
            }) : undefined,
            customTags: card.metadata.customTags?.map(tag => 
              sanitize(tag, { allowedTags: [], ...sanitizationOptions })
            ) || []
          }
        })
      };
    } catch (error) {
      handleContentError(error instanceof Error ? error : new Error('Card sanitization failed'));
      return null;
    }
  }, [card, sanitize, sanitizationOptions, handleContentError]);

  // Get rarity color class
  const getRarityColorClass = useCallback((rarity: string): string => {
    const normalizedRarity = rarity.toLowerCase();
    switch (normalizedRarity) {
      case 'common':
        return 'text-gray-600 bg-gray-100';
      case 'uncommon':
        return 'text-green-600 bg-green-100';
      case 'rare':
        return 'text-blue-600 bg-blue-100';
      case 'epic':
        return 'text-purple-600 bg-purple-100';
      case 'legendary':
        return 'text-yellow-600 bg-yellow-100';
      case 'mythic':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }, []);

  // Format stats display
  const formatStats = useCallback((stats: Record<string, number>): React.ReactNode => {
    if (!stats || Object.keys(stats).length === 0) {
      return <span className="text-gray-500 text-sm">No stats available</span>;
    }

    return (
      <div className="grid grid-cols-2 gap-2 text-sm">
        {Object.entries(stats).map(([statName, value]) => (
          <div key={statName} className="flex justify-between">
            <span className="capitalize text-gray-600">
              {sanitize(statName, { allowedTags: [] })}:
            </span>
            <span className="font-medium">{Math.round(value)}</span>
          </div>
        ))}
      </div>
    );
  }, [sanitize]);

  // Show error state
  if (sanitizationError) {
    return <PetCardErrorFallback error={sanitizationError.message} />;
  }

  // Show loading state
  if (!card) {
    return <PetCardLoadingPlaceholder />;
  }

  // Show error if sanitization failed
  if (!sanitizedCard) {
    return <PetCardErrorFallback error="Card content could not be sanitized" />;
  }

  const cardClassName = `pet-card-safe-display bg-white rounded-lg shadow-md overflow-hidden ${className}`;

  return (
    <div className={cardClassName} {...props}>
      {/* Pet Image */}
      {sanitizedCard.images?.processed && (
        <div className="relative">
          <img
            src={sanitizedCard.images.processed}
            alt={`${sanitizedCard.petName} - ${sanitizedCard.petType}`}
            className="w-full h-48 object-cover"
            onError={(e) => {
              // Fallback to original image if processed image fails
              if (sanitizedCard.images?.original) {
                (e.target as HTMLImageElement).src = sanitizedCard.images.original;
              }
            }}
          />
          
          {/* Rarity Badge */}
          <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${getRarityColorClass(sanitizedCard.rarity)}`}>
            {sanitizedCard.rarity}
          </div>
        </div>
      )}

      {/* Card Content */}
      <div className="p-4">
        {/* Pet Name and Type */}
        <div className="mb-3">
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            {sanitizedCard.petName}
          </h3>
          <p className="text-sm text-gray-600">
            {sanitizedCard.petType}
          </p>
        </div>

        {/* Metadata Section */}
        {showMetadata && sanitizedCard.metadata && (
          <div className="space-y-3">
            {/* Breed */}
            {sanitizedCard.metadata.breed && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Breed
                </span>
                <p className="text-sm text-gray-900">
                  {sanitizedCard.metadata.breed}
                </p>
              </div>
            )}

            {/* Description */}
            {sanitizedCard.metadata.description && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Description
                </span>
                <SafeHTMLDisplay
                  content={sanitizedCard.metadata.description}
                  contentType={ContentType.PET_CARD_METADATA}
                  className="text-sm text-gray-700 mt-1"
                  onRenderError={handleContentError}
                />
              </div>
            )}

            {/* Custom Tags */}
            {sanitizedCard.metadata.customTags && sanitizedCard.metadata.customTags.length > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Tags
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {sanitizedCard.metadata.customTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        {sanitizedCard.stats && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Stats
            </span>
            <div className="mt-2">
              {formatStats(sanitizedCard.stats)}
            </div>
          </div>
        )}

        {/* Evolution Info */}
        {sanitizedCard.evolution && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Evolution
              </span>
              <span className="text-xs text-gray-600">
                Stage {sanitizedCard.evolution.stage}/{sanitizedCard.evolution.maxStage}
              </span>
            </div>
            
            {/* Evolution Progress Bar */}
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(sanitizedCard.evolution.stage / sanitizedCard.evolution.maxStage) * 100}%`
                  }}
                ></div>
              </div>
              {sanitizedCard.evolution.canEvolve && (
                <p className="text-xs text-green-600 mt-1">Ready to evolve!</p>
              )}
            </div>
          </div>
        )}

        {/* Creation Date */}
        {sanitizedCard.createdAt && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <span className="text-xs text-gray-500">
              Created: {new Date(sanitizedCard.createdAt.toDate?.() || sanitizedCard.createdAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PetCardSafeDisplay;