/**
 * Social Share Modal Component with Sanitization
 * Provides secure social media sharing options for pet cards
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Share2,
  Twitter,
  Facebook,
  Linkedin,
  MessageCircle,
  Copy,
  CheckCircle,
  AlertTriangle,
  Shield,
  ExternalLink
} from 'lucide-react';
import { socialSharingService } from '../services/socialSharingService';

const SocialShareModal = ({ 
  isOpen, 
  onClose, 
  card,
  onShareComplete 
}) => {
  const [shareMetadata, setShareMetadata] = useState(null);
  const [socialUrls, setSocialUrls] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && card) {
      generateShareContent();
    }
  }, [isOpen, card]);

  const generateShareContent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Generate sanitized sharing metadata
      const metadata = await socialSharingService.generateSanitizedShareMetadata(
        card.petName,
        card.petType,
        card.rarity,
        card.metadata?.description,
        card.images?.processed || card.images?.original,
        card.metadata?.customTags
      );

      setShareMetadata(metadata);

      // Generate social media URLs
      const urls = socialSharingService.generateSanitizedSocialUrls(metadata);
      setSocialUrls(urls);

    } catch (err) {
      console.error('Error generating share content:', err);
      setError('Failed to generate sharing content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialShare = async (platform, url) => {
    try {
      // Log sharing activity
      if (shareMetadata) {
        await socialSharingService.logSharingActivity(
          shareMetadata,
          platform,
          card.userId
        );
      }

      // Open social media platform
      window.open(url, '_blank', 'width=600,height=400');
      
      if (onShareComplete) {
        onShareComplete(platform);
      }
    } catch (error) {
      console.error(`Error sharing to ${platform}:`, error);
    }
  };

  const handleWebShare = async () => {
    if (!shareMetadata) return;

    try {
      const success = await socialSharingService.shareWithWebAPI(shareMetadata);
      
      if (success) {
        await socialSharingService.logSharingActivity(
          shareMetadata,
          'web_share_api',
          card.userId
        );
        
        if (onShareComplete) {
          onShareComplete('web_share_api');
        }
      }
    } catch (error) {
      console.error('Web share failed:', error);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!shareMetadata) return;

    try {
      const success = await socialSharingService.copyToClipboard(shareMetadata);
      
      if (success) {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
        
        await socialSharingService.logSharingActivity(
          shareMetadata,
          'clipboard',
          card.userId
        );
        
        if (onShareComplete) {
          onShareComplete('clipboard');
        }
      }
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
    }
  };

  const socialPlatforms = [
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-blue-500 hover:bg-blue-600',
      url: socialUrls.twitter
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-600 hover:bg-blue-700',
      url: socialUrls.facebook
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-blue-700 hover:bg-blue-800',
      url: socialUrls.linkedin
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-500 hover:bg-green-600',
      url: socialUrls.whatsapp
    }
  ];

  if (!card) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Share2 className="w-5 h-5" />
            <span>Share Pet Card</span>
          </DialogTitle>
          <DialogDescription>
            Share your {card.rarity} {card.petName} card with friends
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Preparing share content...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-800">{error}</span>
              </div>
            </div>
          )}

          {/* Share Content Preview */}
          {shareMetadata && !isLoading && (
            <>
              <Card className="bg-gray-50">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Share Preview:</h4>
                    <p className="text-sm font-semibold">{shareMetadata.title}</p>
                    <p className="text-xs text-gray-600">{shareMetadata.description}</p>
                    {shareMetadata.hashtags && shareMetadata.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {shareMetadata.hashtags.slice(0, 5).map((hashtag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {hashtag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Security Info */}
              {shareMetadata.sanitizationInfo.violationsFound > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-orange-800">
                      Content sanitized for security ({shareMetadata.sanitizationInfo.violationsFound} issue{shareMetadata.sanitizationInfo.violationsFound > 1 ? 's' : ''} resolved)
                    </span>
                  </div>
                </div>
              )}

              {/* Web Share API (if available) */}
              {navigator.share && (
                <Button 
                  onClick={handleWebShare}
                  className="w-full"
                  variant="default"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share via System
                </Button>
              )}

              {/* Social Media Platforms */}
              <div className="grid grid-cols-2 gap-2">
                {socialPlatforms.map((platform) => {
                  const Icon = platform.icon;
                  return (
                    <Button
                      key={platform.name}
                      onClick={() => handleSocialShare(platform.name.toLowerCase(), platform.url)}
                      className={`${platform.color} text-white`}
                      variant="default"
                      disabled={!platform.url}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {platform.name}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  );
                })}
              </div>

              {/* Copy to Clipboard */}
              <Button
                onClick={handleCopyToClipboard}
                variant="outline"
                className="w-full"
                disabled={copySuccess}
              >
                {copySuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Share Text
                  </>
                )}
              </Button>

              {/* Additional Share Options */}
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500 mb-2">More options:</p>
                <div className="grid grid-cols-1 gap-1">
                  <Button
                    onClick={() => handleSocialShare('reddit', socialUrls.reddit)}
                    variant="ghost"
                    size="sm"
                    className="justify-start text-xs"
                  >
                    <ExternalLink className="w-3 h-3 mr-2" />
                    Share on Reddit
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SocialShareModal;