import { useState, useCallback } from 'react';
import { Card } from '@/models/Card';
import { cardEvolutionService, EvolutionPreview, EvolutionHistory, EvolutionStage } from '@/services/cardEvolutionService';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

interface UseCardEvolutionReturn {
  // Evolution state
  isGeneratingPreview: boolean;
  isEvolving: boolean;
  error: string | null;
  
  // Evolution data
  currentStage: EvolutionStage | null;
  nextStage: EvolutionStage | null;
  canEvolve: boolean;
  evolutionHistory: EvolutionHistory[];
  
  // Actions
  generatePreview: (card: Card) => Promise<EvolutionPreview | null>;
  evolveCard: (card: Card) => Promise<Card | null>;
  getEvolutionHistory: (cardId?: string) => EvolutionHistory[];
  getEvolutionStats: () => any;
  clearError: () => void;
}

export const useCardEvolution = (card?: Card): UseCardEvolutionReturn => {
  const { user } = useAuth();
  const { hasFeatureAccess } = useSubscription();
  
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isEvolving, setIsEvolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user has evolution access
  const hasEvolutionAccess = hasFeatureAccess('cardEvolution');

  // Get current and next stages
  const currentStage = card ? cardEvolutionService.getCurrentStage(card) : null;
  const nextStage = card ? cardEvolutionService.getNextStage(card) : null;
  const canEvolve = card ? cardEvolutionService.canEvolve(card) && hasEvolutionAccess : false;

  // Generate evolution preview
  const generatePreview = useCallback(async (targetCard: Card): Promise<EvolutionPreview | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    if (!hasEvolutionAccess) {
      setError('Evolution feature requires premium subscription');
      return null;
    }

    if (!cardEvolutionService.canEvolve(targetCard)) {
      setError('Card cannot evolve further');
      return null;
    }

    try {
      setIsGeneratingPreview(true);
      setError(null);
      
      const preview = await cardEvolutionService.generateEvolutionPreview(targetCard);
      return preview;
    } catch (err) {
      console.error('Error generating evolution preview:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
      return null;
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [user, hasEvolutionAccess]);

  // Evolve card
  const evolveCard = useCallback(async (targetCard: Card): Promise<Card | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    if (!hasEvolutionAccess) {
      setError('Evolution feature requires premium subscription');
      return null;
    }

    if (!cardEvolutionService.canEvolve(targetCard)) {
      setError('Card cannot evolve further');
      return null;
    }

    try {
      setIsEvolving(true);
      setError(null);
      
      const evolvedCard = await cardEvolutionService.evolveCard(targetCard, user.id);
      return evolvedCard;
    } catch (err) {
      console.error('Error evolving card:', err);
      setError(err instanceof Error ? err.message : 'Failed to evolve card');
      return null;
    } finally {
      setIsEvolving(false);
    }
  }, [user, hasEvolutionAccess]);

  // Get evolution history
  const getEvolutionHistory = useCallback((cardId?: string): EvolutionHistory[] => {
    if (!user) return [];
    
    if (cardId) {
      return cardEvolutionService.getCardEvolutionHistory(user.id, cardId);
    }
    
    return cardEvolutionService.getEvolutionHistory(user.id);
  }, [user]);

  // Get evolution statistics
  const getEvolutionStats = useCallback(() => {
    if (!user) return null;
    
    return cardEvolutionService.getEvolutionStats(user.id);
  }, [user]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get evolution history for current card
  const evolutionHistory = card && user ? 
    cardEvolutionService.getCardEvolutionHistory(user.id, card.id) : [];

  return {
    // State
    isGeneratingPreview,
    isEvolving,
    error,
    
    // Data
    currentStage,
    nextStage,
    canEvolve,
    evolutionHistory,
    
    // Actions
    generatePreview,
    evolveCard,
    getEvolutionHistory,
    getEvolutionStats,
    clearError
  };
};