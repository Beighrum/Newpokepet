import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Sparkles,
  ArrowRight,
  Star,
  Trophy,
  Zap,
  Heart,
  Brain,
  Play,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import ImageCard from '@/components/ImageCard';
import { PetCardSafeDisplay } from '@/components/sanitization/PetCardSafeDisplay';
import { petCardSanitizationService } from '@/services/petCardSanitization';
import { securityEventLogger } from '@/services/securityEventLogger';

const EvolutionPage = () => {
  const [userCards, setUserCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEvolving, setIsEvolving] = useState(false);
  const [evolutionProgress, setEvolutionProgress] = useState(0);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, canEvolve, maxLevel
  const [searchTerm, setSearchTerm] = useState('');
  const [evolutionResult, setEvolutionResult] = useState(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Load user's cards
  useEffect(() => {
    if (user) {
      loadUserCards();
    }
  }, [user]);

  const loadUserCards = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/pet-to-pokemon/us-central1/getUserCards?userId=${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load cards');
      }

      const data = await response.json();
      setUserCards(data.cards || []);
    } catch (error) {
      console.error('Error loading cards:', error);
      setError('Failed to load your cards. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and search cards
  const filteredCards = userCards.filter(card => {
    // Apply search filter using sanitized content
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const sanitizedPetName = card.sanitizedMetadata?.petName || card.petName || '';
      const sanitizedPetType = card.sanitizedMetadata?.petType || card.petType || '';
      
      if (!sanitizedPetName.toLowerCase().includes(searchLower) &&
          !sanitizedPetType.toLowerCase().includes(searchLower) &&
          !card.rarity.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Apply evolution filter
    switch (filter) {
      case 'canEvolve':
        return card.evolution?.canEvolve && card.evolution.stage < card.evolution.maxStage;
      case 'maxLevel':
        return card.evolution?.stage === card.evolution?.maxStage;
      default:
        return true;
    }
  });

  // Check if card can evolve
  const canEvolve = (card) => {
    if (!card.evolution) return false;
    if (card.evolution.stage >= card.evolution.maxStage) return false;
    if (!card.evolution.canEvolve) return false;

    // Check evolution requirements
    const requirements = card.evolution.evolutionRequirements;
    if (!requirements) return true;

    // Check level requirement
    const currentLevel = card.level || 1;
    if (requirements.minLevel && currentLevel < requirements.minLevel) {
      return false;
    }

    // Check stat requirements
    if (requirements.requiredStats) {
      for (const [stat, requiredValue] of Object.entries(requirements.requiredStats)) {
        const currentValue = card.stats?.[stat] || 0;
        if (currentValue < requiredValue) {
          return false;
        }
      }
    }

    return true;
  };

  // Get evolution requirements text
  const getEvolutionRequirements = (card) => {
    if (!card.evolution?.evolutionRequirements) return null;

    const requirements = card.evolution.evolutionRequirements;
    const reqText = [];

    if (requirements.minLevel) {
      const currentLevel = card.level || 1;
      const levelMet = currentLevel >= requirements.minLevel;
      reqText.push({
        text: `Level ${requirements.minLevel}`,
        met: levelMet,
        current: currentLevel
      });
    }

    if (requirements.requiredStats) {
      Object.entries(requirements.requiredStats).forEach(([stat, requiredValue]) => {
        const currentValue = card.stats?.[stat] || 0;
        const statMet = currentValue >= requiredValue;
        reqText.push({
          text: `${stat.charAt(0).toUpperCase() + stat.slice(1)}: ${requiredValue}`,
          met: statMet,
          current: currentValue
        });
      });
    }

    return reqText;
  };

  // Evolve card
  const handleEvolveCard = async (card) => {
    if (!canEvolve(card)) {
      setError('This card cannot be evolved at this time');
      return;
    }

    setIsEvolving(true);
    setEvolutionProgress(0);
    setError(null);
    setEvolutionResult(null);

    try {
      setEvolutionProgress(20);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/pet-to-pokemon/us-central1/evolveCard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          cardId: card.id,
          targetStage: (card.evolution?.stage || 1) + 1
        })
      });

      setEvolutionProgress(60);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to evolve card');
      }

      const result = await response.json();
      setEvolutionProgress(100);

      if (result.success) {
        // Sanitize the evolved card data before displaying
        const sanitizedEvolvedCard = await petCardSanitizationService.sanitizeCardMetadata(result.card);
        
        setEvolutionResult({
          originalCard: card,
          evolvedCard: sanitizedEvolvedCard
        });

        // Update the card in the local state
        setUserCards(prevCards => 
          prevCards.map(c => c.id === card.id ? sanitizedEvolvedCard : c)
        );

        // Log successful evolution for security monitoring
        await securityEventLogger.logSecurityEvent({
          type: 'card_evolution',
          severity: 'info',
          userId: user.uid,
          details: {
            cardId: card.id,
            originalStage: card.evolution?.stage,
            newStage: sanitizedEvolvedCard.evolution?.stage,
            timestamp: new Date()
          }
        });

        // Clear selected card to show the result
        setSelectedCard(null);
      } else {
        throw new Error(result.message || 'Evolution failed');
      }

    } catch (error) {
      console.error('Error evolving card:', error);
      setError(error.message || 'An unexpected error occurred during evolution');
    } finally {
      setIsEvolving(false);
      setEvolutionProgress(0);
    }
  };

  // Get rarity color
  const getRarityColor = (rarity) => {
    switch (rarity?.toLowerCase()) {
      case 'common': return 'text-gray-600 bg-gray-100';
      case 'uncommon': return 'text-green-600 bg-green-100';
      case 'rare': return 'text-blue-600 bg-blue-100';
      case 'epic': return 'text-purple-600 bg-purple-100';
      case 'legendary': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get stage name
  const getStageName = (stage) => {
    switch (stage) {
      case 1: return 'Baby';
      case 2: return 'Adult';
      case 3: return 'Elder';
      default: return `Stage ${stage}`;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Card Evolution Center
          </h1>
          <p className="text-lg text-gray-600">
            Evolve your pet cards to unlock new stages and enhanced abilities
          </p>
        </div>

        {/* Evolution Result Display */}
        {evolutionResult && (
          <Card className="mb-8 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                Evolution Successful!
              </CardTitle>
              <CardDescription>
                Your {evolutionResult.originalCard.petName} has evolved to the next stage!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="mb-2">
                    <ImageCard
                      card={evolutionResult.originalCard}
                      onClick={() => {}}
                      showStats={false}
                      className="max-w-48"
                    />
                  </div>
                  <Badge variant="outline">
                    {getStageName(evolutionResult.originalCard.evolution?.stage)}
                  </Badge>
                </div>
                
                <ArrowRight className="w-8 h-8 text-green-600" />
                
                <div className="text-center">
                  <div className="mb-2">
                    <ImageCard
                      card={evolutionResult.evolvedCard}
                      onClick={() => {}}
                      showStats={false}
                      className="max-w-48"
                    />
                  </div>
                  <Badge variant="outline">
                    {getStageName(evolutionResult.evolvedCard.evolution?.stage)}
                  </Badge>
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <Button onClick={() => setEvolutionResult(null)}>
                  Continue Evolving
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading your cards...</p>
          </div>
        ) : (
          <Tabs defaultValue="cards" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cards">My Cards</TabsTrigger>
              <TabsTrigger value="evolution">Evolution Lab</TabsTrigger>
            </TabsList>

            {/* Cards Tab */}
            <TabsContent value="cards" className="space-y-6">
              {/* Filters and Search */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Search cards by name, type, or rarity..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant={filter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('all')}
                      >
                        All Cards
                      </Button>
                      <Button
                        variant={filter === 'canEvolve' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('canEvolve')}
                      >
                        <Sparkles className="w-4 h-4 mr-1" />
                        Can Evolve
                      </Button>
                      <Button
                        variant={filter === 'maxLevel' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('maxLevel')}
                      >
                        <Trophy className="w-4 h-4 mr-1" />
                        Max Level
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cards Grid */}
              {filteredCards.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Sparkles className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {userCards.length === 0 ? 'No Cards Yet' : 'No Cards Match Your Filter'}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {userCards.length === 0 
                        ? 'Generate your first pet card to get started with evolution!'
                        : 'Try adjusting your search or filter criteria.'
                      }
                    </p>
                    {userCards.length === 0 && (
                      <Button onClick={() => navigate('/upload')}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate First Card
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredCards.map((card) => (
                    <div key={card.id} className="relative">
                      <ImageCard
                        card={card}
                        onClick={() => setSelectedCard(card)}
                        showStats={true}
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                      />
                      
                      {/* Evolution Status Overlay */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        <Badge className={getRarityColor(card.rarity)}>
                          {card.rarity}
                        </Badge>
                        
                        {card.evolution && (
                          <Badge variant="outline" className="text-xs">
                            {getStageName(card.evolution.stage)} 
                            {card.evolution.stage < card.evolution.maxStage && (
                              <ArrowRight className="w-3 h-3 ml-1" />
                            )}
                          </Badge>
                        )}
                        
                        {canEvolve(card) && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Ready
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Evolution Lab Tab */}
            <TabsContent value="evolution" className="space-y-6">
              {selectedCard ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Selected Card Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Selected Card</CardTitle>
                      <CardDescription>
                        <PetCardSafeDisplay 
                          card={selectedCard}
                          field="petName"
                          fallback={selectedCard.petName}
                        /> • <PetCardSafeDisplay 
                          card={selectedCard}
                          field="petType"
                          fallback={selectedCard.petType}
                        />
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-center">
                        <ImageCard
                          card={selectedCard}
                          onClick={() => {}}
                          showStats={true}
                          className="max-w-sm"
                        />
                      </div>

                      {/* Current Stats */}
                      <div>
                        <h4 className="font-medium mb-2">Current Stats</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(selectedCard.stats || {}).map(([stat, value]) => (
                            <div key={stat} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm capitalize">{stat}</span>
                              <span className="font-medium">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Evolution Status */}
                      {selectedCard.evolution && (
                        <div>
                          <h4 className="font-medium mb-2">Evolution Status</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Current Stage</span>
                              <Badge variant="outline">
                                {getStageName(selectedCard.evolution.stage)} 
                                ({selectedCard.evolution.stage}/{selectedCard.evolution.maxStage})
                              </Badge>
                            </div>
                            
                            {selectedCard.evolution.stage < selectedCard.evolution.maxStage && (
                              <div className="space-y-2">
                                <span className="text-sm font-medium">Requirements for Next Stage:</span>
                                {getEvolutionRequirements(selectedCard)?.map((req, index) => (
                                  <div key={index} className="flex items-center justify-between text-sm">
                                    <span className={req.met ? 'text-green-600' : 'text-red-600'}>
                                      {req.met ? <CheckCircle className="w-4 h-4 inline mr-1" /> : <AlertCircle className="w-4 h-4 inline mr-1" />}
                                      {req.text}
                                    </span>
                                    {req.current !== undefined && (
                                      <span className="text-gray-500">({req.current})</span>
                                    )}
                                  </div>
                                )) || (
                                  <p className="text-sm text-green-600">
                                    <CheckCircle className="w-4 h-4 inline mr-1" />
                                    Ready to evolve!
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Evolution Action */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Evolution Lab</CardTitle>
                      <CardDescription>
                        Transform your card to the next evolution stage
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedCard.evolution?.stage >= selectedCard.evolution?.maxStage ? (
                        <div className="text-center py-8">
                          <Trophy className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
                          <h3 className="text-lg font-medium mb-2">Maximum Evolution Reached!</h3>
                          <p className="text-gray-600">
                            This card has reached its final evolution stage.
                          </p>
                        </div>
                      ) : canEvolve(selectedCard) ? (
                        <div className="space-y-4">
                          <div className="text-center">
                            <Sparkles className="w-12 h-12 mx-auto text-blue-500 mb-4" />
                            <h3 className="text-lg font-medium mb-2">Ready to Evolve!</h3>
                            <p className="text-gray-600 mb-4">
                              Your <PetCardSafeDisplay 
                                card={selectedCard}
                                field="petName"
                                fallback={selectedCard.petName}
                                className="inline"
                              /> meets all requirements for evolution.
                            </p>
                          </div>

                          {/* Evolution Preview */}
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-medium mb-2">Evolution Preview</h4>
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between">
                                <span>Stage:</span>
                                <span>{getStageName(selectedCard.evolution.stage)} → {getStageName(selectedCard.evolution.stage + 1)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Stat Boost:</span>
                                <span className="text-green-600">+15-25% to all stats</span>
                              </div>
                              <div className="flex justify-between">
                                <span>New Abilities:</span>
                                <span>Enhanced visual effects</span>
                              </div>
                            </div>
                          </div>

                          <Button
                            onClick={() => handleEvolveCard(selectedCard)}
                            disabled={isEvolving}
                            className="w-full"
                            size="lg"
                          >
                            {isEvolving ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Evolving...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Evolve Card
                              </>
                            )}
                          </Button>

                          {/* Evolution Progress */}
                          {isEvolving && (
                            <div className="space-y-2">
                              <Progress value={evolutionProgress} className="w-full" />
                              <p className="text-sm text-gray-600 text-center">
                                {evolutionProgress < 30 && 'Preparing evolution...'}
                                {evolutionProgress >= 30 && evolutionProgress < 70 && 'Processing transformation...'}
                                {evolutionProgress >= 70 && 'Finalizing evolution...'}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <AlertCircle className="w-12 h-12 mx-auto text-orange-500 mb-4" />
                          <h3 className="text-lg font-medium mb-2">Requirements Not Met</h3>
                          <p className="text-gray-600 mb-4">
                            Your card needs to meet certain requirements before it can evolve.
                          </p>
                          
                          <div className="text-left bg-orange-50 p-4 rounded-lg">
                            <h4 className="font-medium mb-2">Missing Requirements:</h4>
                            {getEvolutionRequirements(selectedCard)?.filter(req => !req.met).map((req, index) => (
                              <div key={index} className="text-sm text-orange-700 mb-1">
                                • {req.text} {req.current !== undefined && `(currently ${req.current})`}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => setSelectedCard(null)}
                          className="w-full"
                        >
                          Select Different Card
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Sparkles className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Select a Card to Evolve
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Choose a card from the "My Cards" tab to begin the evolution process.
                    </p>
                    <Button variant="outline" onClick={() => document.querySelector('[value="cards"]').click()}>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Browse My Cards
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default EvolutionPage;
