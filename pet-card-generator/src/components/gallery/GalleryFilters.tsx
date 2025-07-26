import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Search, 
  Filter, 
  X, 
  Calendar as CalendarIcon,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import { RarityLevel } from '@/services/raritySystem';
import { FilterOptions, SortOptions } from '@/services/firestoreService';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface GalleryFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  sort: SortOptions;
  onSortChange: (sort: SortOptions) => void;
  availablePetTypes?: string[];
  availableTags?: string[];
  className?: string;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
}

const RARITY_OPTIONS: { value: RarityLevel; label: string }[] = [
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'epic', label: 'Epic' },
  { value: 'legendary', label: 'Legendary' },
  { value: 'secret_rare', label: 'Secret Rare' }
];

const SORT_OPTIONS: { value: SortOptions['field']; label: string }[] = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'updatedAt', label: 'Last Modified' },
  { value: 'petName', label: 'Pet Name' },
  { value: 'rarity', label: 'Rarity' },
  { value: 'shareCount', label: 'Popularity' }
];

const GalleryFilters: React.FC<GalleryFiltersProps> = ({
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  availablePetTypes = [],
  availableTags = [],
  className = '',
  showAdvanced = false,
  onToggleAdvanced
}) => {
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });

  // Handle search input
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  }, [onSearchChange]);

  // Handle filter changes
  const handleRarityChange = useCallback((value: string) => {
    onFiltersChange({
      ...filters,
      rarity: value === 'all' ? undefined : value as RarityLevel
    });
  }, [filters, onFiltersChange]);

  const handlePetTypeChange = useCallback((value: string) => {
    onFiltersChange({
      ...filters,
      petType: value === 'all' ? undefined : value
    });
  }, [filters, onFiltersChange]);

  const handleFavoriteChange = useCallback((value: string) => {
    onFiltersChange({
      ...filters,
      isFavorite: value === 'all' ? undefined : value === 'favorites'
    });
  }, [filters, onFiltersChange]);

  const handleTagAdd = useCallback((tag: string) => {
    const currentTags = filters.tags || [];
    if (!currentTags.includes(tag)) {
      onFiltersChange({
        ...filters,
        tags: [...currentTags, tag]
      });
    }
  }, [filters, onFiltersChange]);

  const handleTagRemove = useCallback((tag: string) => {
    const currentTags = filters.tags || [];
    onFiltersChange({
      ...filters,
      tags: currentTags.filter(t => t !== tag)
    });
  }, [filters, onFiltersChange]);

  const handleDateRangeChange = useCallback((range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
    
    if (range.from && range.to) {
      onFiltersChange({
        ...filters,
        dateRange: {
          start: range.from.getTime(),
          end: range.to.getTime()
        }
      });
    } else {
      onFiltersChange({
        ...filters,
        dateRange: undefined
      });
    }
  }, [filters, onFiltersChange]);

  // Handle sort changes
  const handleSortFieldChange = useCallback((value: string) => {
    onSortChange({
      ...sort,
      field: value as SortOptions['field']
    });
  }, [sort, onSortChange]);

  const handleSortDirectionChange = useCallback((value: string) => {
    onSortChange({
      ...sort,
      direction: value as SortOptions['direction']
    });
  }, [sort, onSortChange]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    onSearchChange('');
    onFiltersChange({});
    setDateRange({ from: undefined, to: undefined });
    onSortChange({ field: 'createdAt', direction: 'desc' });
  }, [onSearchChange, onFiltersChange, onSortChange]);

  // Count active filters
  const activeFilterCount = [
    filters.rarity,
    filters.petType,
    filters.isFavorite !== undefined,
    filters.tags?.length,
    filters.dateRange
  ].filter(Boolean).length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by pet name..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>

        {/* Quick Sort */}
        <div className="flex gap-2">
          <Select value={sort.field} onValueChange={handleSortFieldChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort.direction} onValueChange={handleSortDirectionChange}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">↓</SelectItem>
              <SelectItem value="asc">↑</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={onToggleAdvanced}
            className={cn(activeFilterCount > 0 && 'bg-blue-50 border-blue-200')}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <Badge 
                variant="secondary" 
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              Advanced Filters
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-gray-500 hover:text-gray-700"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Rarity Filter */}
            <div className="space-y-2">
              <Label>Rarity</Label>
              <Select 
                value={filters.rarity || 'all'} 
                onValueChange={handleRarityChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rarities</SelectItem>
                  {RARITY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pet Type Filter */}
            <div className="space-y-2">
              <Label>Pet Type</Label>
              <Select 
                value={filters.petType || 'all'} 
                onValueChange={handlePetTypeChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {availablePetTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Favorites Filter */}
            <div className="space-y-2">
              <Label>Favorites</Label>
              <Select 
                value={
                  filters.isFavorite === undefined ? 'all' : 
                  filters.isFavorite ? 'favorites' : 'non-favorites'
                } 
                onValueChange={handleFavoriteChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cards</SelectItem>
                  <SelectItem value="favorites">Favorites Only</SelectItem>
                  <SelectItem value="non-favorites">Non-Favorites</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dateRange.from && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'LLL dd, y')} -{' '}
                          {format(dateRange.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(dateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={handleDateRangeChange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Tags Filter */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(filters.tags || []).map(tag => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button
                    onClick={() => handleTagRemove(tag)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            
            {availableTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {availableTags
                  .filter(tag => !(filters.tags || []).includes(tag))
                  .slice(0, 10)
                  .map(tag => (
                    <Button
                      key={tag}
                      variant="outline"
                      size="sm"
                      onClick={() => handleTagAdd(tag)}
                      className="h-6 text-xs"
                    >
                      + {tag}
                    </Button>
                  ))
                }
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryFilters;