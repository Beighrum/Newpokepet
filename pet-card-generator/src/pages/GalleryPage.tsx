import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Grid3X3, 
  List, 
  Plus, 
  Trash2, 
  Share2, 
  Download,
  Eye,
  Settings,
  AlertTriangle,
  Loader2,
  BarChart3
} from 'lucide-react';
import CardGrid from '@/components/gallery/CardGrid';
import GalleryFilters from '@/components/gallery/GalleryFilters';
import CollectionStats from '@/components/gallery/CollectionStats';
import { Card as CardModel } from '@/models/Card';
import { FilterOptions, SortOptions, PaginationOptions } from '@/services/firestoreService';
import { firestoreService } from '@/services/firestoreService';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const CARDS_PER_PAGE = 20;

const GalleryPage: React.FC = () => {
  const { user } = useAuth();
  
  // State
  const [cards, setCards] = useState<CardModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [sort, setSort] = useState<SortOptions>({ field: 'createdAt', direction: 'desc' });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // View options
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridCols, setGridCols] = useState<2 | 3 | 4 | 5 | 6>(4);
  const [showStats, setShowStats] = useState(false);
  
  // Selection and actions
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  
  // Dialogs
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; card: CardModel | null }>({ 
    open: false, 
    card: null 
  });
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  
  // Statistics
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  
  // Available filter options
  const [availablePetTypes, setAvailablePetTypes] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Load cards
  const loadCards = useCallback(async (reset = false) => {
    if (!user) return;
    
    try {
      if (reset) {
        setLoading(true);
        setCards([]);
        setLastDoc(null);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }
      
      setError(null);
      
      const pagination: PaginationOptions = {
        pageSize: CARDS_PER_PAGE,
        ...(lastDoc && !reset && { lastDoc })
      };
      
      let result;
      if (searchTerm.trim()) {
        result = await firestoreService.searchCards(user.id, searchTerm, {
          pagination,
          filters
        });
      } else {
        result = await firestoreService.getUserCards(user.id, {
          pagination,
          filters,
          sort
        });
      }
      
      if (reset) {
        setCards(result.items);
      } else {
        setCards(prev => [...prev, ...result.items]);
      }
      
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
      
    } catch (err) {
      console.error('Error loading cards:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cards');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, searchTerm, filters, sort, lastDoc]);
  
  // Load statistics
  const loadStats = useCallback(async () => {
    if (!user) return;
    
    try {
      setStatsLoading(true);
      const cardStats = await firestoreService.getCardStatistics(user.id);
      setStats(cardStats);
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [user]);
  
  // Extract available filter options from cards
  const updateFilterOptions = useCallback(() => {
    const petTypes = new Set<string>();
    const tags = new Set<string>();
    
    cards.forEach(card => {
      petTypes.add(card.petType);
      card.tags.forEach(tag => tags.add(tag));
    });
    
    setAvailablePetTypes(Array.from(petTypes).sort());
    setAvailableTags(Array.from(tags).sort());
  }, [cards]);
  
  // Effects
  useEffect(() => {
    loadCards(true);
  }, [searchTerm, filters, sort]);
  
  useEffect(() => {
    updateFilterOptions();
  }, [updateFilterOptions]);
  
  useEffect(() => {
    if (showStats) {
      loadStats();
    }
  }, [showStats, loadStats]);

  // Handle card actions
  const handleCardClick = useCallback((card: CardModel) => {
    // TODO: Open card detail modal
    console.log('Card clicked:', card);
  }, []);

  const handleCardFavorite = useCallback(async (cardId: string, isFavorite: boolean) => {
    if (!user) return;
    
    try {
      await firestoreService.updateCard(user.id, cardId, { isFavorite });
      setCards(prev => prev.map(card => 
        card.id === cardId ? { ...card, isFavorite } : card
      ));
    } catch (err) {
      console.error('Error updating favorite:', err);
      setError('Failed to update favorite status');
    }
  }, [user]);

  const handleCardShare = useCallback((card: CardModel) => {
    // TODO: Implement sharing functionality
    console.log('Share card:', card);
  }, []);

  const handleCardDownload = useCallback((card: CardModel) => {
    // TODO: Implement download functionality
    console.log('Download card:', card);
  }, []);

  const handleCardEdit = useCallback((card: CardModel) => {
    // TODO: Navigate to edit page
    console.log('Edit card:', card);
  }, []);

  const handleCardDelete = useCallback((card: CardModel) => {
    setDeleteDialog({ open: true, card });
  }, []);

  const handleCardView = useCallback((card: CardModel) => {
    // TODO: Open card detail view
    console.log('View card:', card);
  }, []);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (!user || !deleteDialog.card) return;
    
    try {
      await firestoreService.deleteCard(user.id, deleteDialog.card.id);
      setCards(prev => prev.filter(card => card.id !== deleteDialog.card!.id));
      setDeleteDialog({ open: false, card: null });
    } catch (err) {
      console.error('Error deleting card:', err);
      setError('Failed to delete card');
    }
  }, [user, deleteDialog.card]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    if (!user || selectedCards.length === 0) return;
    
    try {
      await Promise.all(
        selectedCards.map(cardId => firestoreService.deleteCard(user.id, cardId))
      );
      setCards(prev => prev.filter(card => !selectedCards.includes(card.id)));
      setSelectedCards([]);
      setBulkDeleteDialog(false);
      setSelectionMode(false);
    } catch (err) {
      console.error('Error deleting cards:', err);
      setError('Failed to delete selected cards');
    }
  }, [user, selectedCards]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadCards(false);
    }
  }, [loadCards, loadingMore, hasMore]);

  // Memoized filtered cards count
  const filteredCount = useMemo(() => cards.length, [cards.length]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to view your gallery</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Gallery</h1>
          <p className="text-gray-600">
            {filteredCount} card{filteredCount !== 1 ? 's' : ''} in your collection
          </p>
        </div>
        
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Grid Columns (only for grid view) */}
          {viewMode === 'grid' && (
            <select
              value={gridCols}
              onChange={(e) => setGridCols(Number(e.target.value) as 2 | 3 | 4 | 5 | 6)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value={2}>2 cols</option>
              <option value={3}>3 cols</option>
              <option value={4}>4 cols</option>
              <option value={5}>5 cols</option>
              <option value={6}>6 cols</option>
            </select>
          )}

          {/* Stats Toggle */}
          <Button
            variant={showStats ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowStats(!showStats)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Stats
          </Button>

          {/* Selection Mode Toggle */}
          <Button
            variant={selectionMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) {
                setSelectedCards([]);
              }
            }}
          >
            <Settings className="h-4 w-4 mr-2" />
            Select
          </Button>
        </div>
      </div>

      {/* Selection Actions */}
      {selectionMode && selectedCards.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedCards.length} card{selectedCards.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkDeleteDialog(true)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCards([])}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-2 h-auto p-0 text-red-600 hover:text-red-700"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics */}
      {showStats && (
        <div className="mb-8">
          {statsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : stats ? (
            <CollectionStats stats={stats} />
          ) : null}
        </div>
      )}

      {/* Filters */}
      <GalleryFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFiltersChange={setFilters}
        sort={sort}
        onSortChange={setSort}
        availablePetTypes={availablePetTypes}
        availableTags={availableTags}
        showAdvanced={showAdvancedFilters}
        onToggleAdvanced={() => setShowAdvancedFilters(!showAdvancedFilters)}
        className="mb-8"
      />

      {/* Card Grid */}
      <CardGrid
        cards={cards}
        loading={loading}
        onCardClick={handleCardClick}
        onCardFavorite={handleCardFavorite}
        onCardShare={handleCardShare}
        onCardDownload={handleCardDownload}
        onCardEdit={handleCardEdit}
        onCardDelete={handleCardDelete}
        onCardView={handleCardView}
        gridCols={gridCols}
        selectable={selectionMode}
        selectedCards={selectedCards}
        onSelectionChange={setSelectedCards}
      />

      {/* Load More */}
      {hasMore && !loading && (
        <div className="text-center mt-8">
          <Button
            onClick={handleLoadMore}
            disabled={loadingMore}
            variant="outline"
            size="lg"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More Cards'
            )}
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => 
        setDeleteDialog({ open, card: deleteDialog.card })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Card</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.card?.petName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, card: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              Delete Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Selected Cards</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedCards.length} selected card{selectedCards.length !== 1 ? 's' : ''}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
            >
              Delete {selectedCards.length} Card{selectedCards.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GalleryPage;