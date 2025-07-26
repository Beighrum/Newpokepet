import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  HardDrive,
  Star,
  Heart,
  Share2,
  Download
} from 'lucide-react';
import { RarityLevel } from '@/services/raritySystem';
import RarityBadge from '@/components/rarity/RarityBadge';
import { cn } from '@/lib/utils';

interface CollectionStatsProps {
  stats: {
    totalCards: number;
    rarityBreakdown: Record<RarityLevel, number>;
    averageFileSize: number;
    totalFileSize: number;
    mostUsedPetTypes: Array<{ petType: string; count: number }>;
    recentActivity: Array<{ date: string; count: number }>;
  };
  userStats?: {
    favoriteCards: number;
    shareCount: number;
    downloadCount: number;
    joinDate: number;
    lastActive: number;
  };
  className?: string;
  showDetailed?: boolean;
}

const RARITY_LABELS: Record<RarityLevel, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  secret_rare: 'Secret Rare'
};

const CollectionStats: React.FC<CollectionStatsProps> = ({
  stats,
  userStats,
  className = '',
  showDetailed = true
}) => {
  // Calculate rarity percentages
  const rarityPercentages = React.useMemo(() => {
    const total = stats.totalCards;
    if (total === 0) return {};
    
    return Object.entries(stats.rarityBreakdown).reduce((acc, [rarity, count]) => {
      acc[rarity as RarityLevel] = (count / total) * 100;
      return acc;
    }, {} as Record<RarityLevel, number>);
  }, [stats.rarityBreakdown, stats.totalCards]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString();
  };

  // Calculate days since join
  const daysSinceJoin = userStats ? 
    Math.floor((Date.now() - userStats.joinDate) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cards</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCards}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {userStats && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Favorites</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.favoriteCards}</p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <Heart className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Storage Used</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatFileSize(stats.totalFileSize)}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <HardDrive className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {userStats && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Shares</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.shareCount}</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Share2 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {showDetailed && (
        <>
          {/* Rarity Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="w-5 h-5 mr-2 text-yellow-500" />
                Rarity Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(stats.rarityBreakdown)
                .filter(([, count]) => count > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([rarity, count]) => {
                  const percentage = rarityPercentages[rarity as RarityLevel] || 0;
                  return (
                    <div key={rarity} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <RarityBadge rarity={rarity as RarityLevel} size="sm" />
                          <span className="font-medium">
                            {RARITY_LABELS[rarity as RarityLevel]}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">
                            {count} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <Progress 
                        value={percentage} 
                        className="h-2"
                      />
                    </div>
                  );
                })
              }
              
              {stats.totalCards === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No cards in collection yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pet Types */}
          {stats.mostUsedPetTypes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Most Popular Pet Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.mostUsedPetTypes.slice(0, 5).map((petType, index) => {
                    const percentage = (petType.count / stats.totalCards) * 100;
                    return (
                      <div key={petType.petType} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center p-0">
                            {index + 1}
                          </Badge>
                          <span className="font-medium capitalize">{petType.petType}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">
                            {petType.count} ({percentage.toFixed(1)}%)
                          </span>
                          <div className="w-16">
                            <Progress value={percentage} className="h-2" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          {stats.recentActivity.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.recentActivity.slice(0, 7).map((activity, index) => {
                    const maxCount = Math.max(...stats.recentActivity.map(a => a.count));
                    const percentage = (activity.count / maxCount) * 100;
                    
                    return (
                      <div key={activity.date} className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {new Date(activity.date).toLocaleDateString()}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">
                            {activity.count} card{activity.count !== 1 ? 's' : ''}
                          </span>
                          <div className="w-20">
                            <Progress value={percentage} className="h-2" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Info */}
          {userStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-blue-500" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Member since:</span>
                      <span className="text-sm font-medium">
                        {formatDate(userStats.joinDate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Days active:</span>
                      <span className="text-sm font-medium">{daysSinceJoin}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Last active:</span>
                      <span className="text-sm font-medium">
                        {formatDate(userStats.lastActive)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total downloads:</span>
                      <span className="text-sm font-medium flex items-center">
                        <Download className="w-4 h-4 mr-1" />
                        {userStats.downloadCount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Average file size:</span>
                      <span className="text-sm font-medium">
                        {formatFileSize(stats.averageFileSize)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Cards per day:</span>
                      <span className="text-sm font-medium">
                        {daysSinceJoin > 0 ? (stats.totalCards / daysSinceJoin).toFixed(1) : '0'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default CollectionStats;