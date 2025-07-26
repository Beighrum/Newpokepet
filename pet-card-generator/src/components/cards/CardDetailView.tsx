import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Heart, 
  Share2, 
  Download, 
  Edit,
  Calendar,
  Tag,
  Star,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { Card as CardModel } from '@/models/Card';
import RarityBadge from '@/components/rarity/RarityBadge';
import { cn } from '@/lib/utils';

interface CardDetailViewProps {
  card: CardModel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFavorite?: (cardId: string, isFavorite: boolean) => void;
  onShare?: (card: CardModel) => void;
  onDownload?: (card: CardModel) => void;
  onEdit?: (card: CardModel) => void;
  className?: string;
}

const CardDetailView: React.FC<CardDetailViewProps> = ({
  card,
  open,
  onOpenChange,
  onFavorite,
  onShare,
  onDownload,
  onEdit,
  className = ''
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [animationPlaying, setAnimationPlaying] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Handle image load events
  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  // Handle animation toggle
  const handleAnimationToggle = () => {
    setAnimationPlaying(!animationPlaying);
  };

  // Handle copy to clipboard
  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate total power
  const totalPower = card.stats.attack + card.stats.defense + card.stats.speed + card.stats.health;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-4xl max-h-[90vh] overflow-y-auto', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <span>{card.petName}</span>
              <RarityBadge rarity={card.rarity} size=\"sm\" showGlow />
            </span>
            <div className="flex items-center space-x-2">
              {onFavorite && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFavorite(card.id, !card.isFavorite)}
                  className={cn(
                    'transition-colors',
                    card.isFavorite ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'
                  )}
                >
                  <Heart className={cn('h-4 w-4', card.isFavorite && 'fill-current')} />
                </Button>
              )}
              {onShare && (
                <Button variant="ghost" size="sm" onClick={() => onShare(card)}>
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
              {onDownload && (
                <Button variant="ghost" size="sm" onClick={() => onDownload(card)}>
                  <Download className="h-4 w-4" />
                </Button>
              )}
              {onEdit && (
                <Button variant="ghost" size="sm" onClick={() => onEdit(card)}>
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600" />
                </div>
              )}
              
              {imageError ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🖼️</div>
                    <div>Image not available</div>
                  </div>
                </div>
              ) : (
                <img
                  src={animationPlaying && card.animation?.enabled ? 
                    card.animation.animatedUrl : card.image.processedUrl}
                  alt={`${card.petName} - ${card.petType}`}
                  className="w-full h-full object-cover"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              )}

              {/* Animation Controls */}
              {card.animation?.enabled && (
                <div className="absolute bottom-4 right-4 flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleAnimationToggle}
                    className="bg-white/80 backdrop-blur-sm hover:bg-white"
                  >
                    {animationPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setAnimationPlaying(true)}
                    className="bg-white/80 backdrop-blur-sm hover:bg-white"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Image Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Image Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Dimensions:</span>
                  <span className="text-sm font-medium">
                    {card.image.width} × {card.image.height}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">File Size:</span>
                  <span className="text-sm font-medium">
                    {(card.image.fileSize / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Format:</span>
                  <span className="text-sm font-medium uppercase">
                    {card.image.format}
                  </span>
                </div>
                {card.animation?.enabled && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Animation:</span>
                      <Badge variant="secondary">
                        {card.animation.type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Duration:</span>
                      <span className="text-sm font-medium">
                        {card.animation.duration}ms
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Details Section */}
          <div className="space-y-4">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pet Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Name:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{card.petName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(card.petName, 'name')}
                      className="h-6 w-6 p-0"
                    >
                      {copiedField === 'name' ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Type:</span>
                  <span className="text-sm font-medium capitalize">{card.petType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Rarity:</span>
                  <RarityBadge rarity={card.rarity} size="sm" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Power:</span>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">{totalPower}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Battle Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">{card.stats.attack}</div>
                    <div className="text-xs text-gray-600">Attack</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">{card.stats.defense}</div>
                    <div className="text-xs text-gray-600">Defense</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">{card.stats.speed}</div>
                    <div className="text-xs text-gray-600">Speed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-500">{card.stats.health}</div>
                    <div className="text-xs text-gray-600">Health</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            {card.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Tag className="h-4 w-4 mr-2" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {card.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Metadata
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-600">Created:</span>
                  <span className="text-sm font-medium text-right">
                    {formatDate(card.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-600">Updated:</span>
                  <span className="text-sm font-medium text-right">
                    {formatDate(card.updatedAt)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Shares:</span>
                  <span className="text-sm font-medium">{card.shareCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Downloads:</span>
                  <span className="text-sm font-medium">{card.downloadCount}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-600">Card ID:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono text-right break-all">
                      {card.id}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(card.id, 'id')}
                      className="h-6 w-6 p-0"
                    >
                      {copiedField === 'id' ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* External Links */}
            {(card.image.originalUrl || card.animation?.animatedUrl) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Links
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {card.image.originalUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(card.image.originalUrl, '_blank')}
                      className="w-full justify-start"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Original Image
                    </Button>
                  )}
                  {card.animation?.animatedUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(card.animation!.animatedUrl, '_blank')}
                      className="w-full justify-start"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Animation
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CardDetailView;