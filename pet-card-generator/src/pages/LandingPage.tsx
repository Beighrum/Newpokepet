import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Upload,
  Palette,
  Share2,
  Star,
  ArrowRight,
  Play,
  ChevronLeft,
  ChevronRight,
  Zap,
  Shield,
  Heart,
  Trophy,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '@/components/LoadingSpinner';
import OnboardingTooltip from '@/components/OnboardingTooltip';
import ScrollToTop from '@/components/ScrollToTop';
import { LandingHero } from '@/components/landing-hero';

// Sample pet card data for the carousel
const sampleCards = [
  {
    id: 1,
    petName: "Luna",
    breed: "Golden Retriever",
    rarity: "legendary",
    imageUrl: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=400&fit=crop&crop=face",
    style: "Fantasy",
    colors: ["golden", "white"]
  },
  {
    id: 2,
    petName: "Shadow",
    breed: "Black Cat",
    rarity: "epic",
    imageUrl: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop&crop=face",
    style: "Cyberpunk",
    colors: ["black", "purple"]
  },
  {
    id: 3,
    petName: "Buddy",
    breed: "Beagle",
    rarity: "rare",
    imageUrl: "https://images.unsplash.com/photo-1551717743-49959800b1f6?w=400&h=400&fit=crop&crop=face",
    style: "Cartoon",
    colors: ["brown", "white"]
  },
  {
    id: 4,
    petName: "Whiskers",
    breed: "Persian Cat",
    rarity: "uncommon",
    imageUrl: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400&h=400&fit=crop&crop=face",
    style: "Realistic",
    colors: ["gray", "white"]
  },
  {
    id: 5,
    petName: "Max",
    breed: "German Shepherd",
    rarity: "common",
    imageUrl: "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=400&h=400&fit=crop&crop=face",
    style: "Fantasy",
    colors: ["brown", "black"]
  }
];

const rarityColors: Record<string, string> = {
  common: "bg-gray-500",
  uncommon: "bg-green-500",
  rare: "bg-blue-500",
  epic: "bg-purple-500",
  legendary: "bg-yellow-500",
  secret_rare: "bg-pink-500"
};

const LandingPage: React.FC = () => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Trigger animations on mount and check for first visit
  useEffect(() => {
    const timer = setTimeout(() => setHasAnimated(true), 100);

    // Check if this is the user's first visit
    const hasVisited = localStorage.getItem('pet-card-generator-visited');
    if (!hasVisited && !user) {
      // Show onboarding after a short delay
      setTimeout(() => setShowOnboarding(true), 2000);
      localStorage.setItem('pet-card-generator-visited', 'true');
    }

    return () => clearTimeout(timer);
  }, [user]);

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCardIndex((prev) => (prev + 1) % sampleCards.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Keyboard navigation for carousel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        prevCard();
      } else if (event.key === 'ArrowRight') {
        nextCard();
      } else if (event.key === 'Escape' && showOnboarding) {
        setShowOnboarding(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showOnboarding]);

  const handleSignUp = async () => {
    if (user) {
      navigate('/upload');
    } else {
      setIsLoading(true);
      try {
        await signInWithGoogle();
        // Small delay for better UX
        setTimeout(() => {
          setIsLoading(false);
          navigate('/upload');
        }, 1000);
      } catch (error) {
        console.error('Error signing in:', error);
        setIsLoading(false);
      }
    }
  };

  const handleOnboardingGetStarted = () => {
    setShowOnboarding(false);
    handleSignUp();
  };

  const handleShowOnboarding = () => {
    setShowOnboarding(true);
  };

  const handleDemo = () => {
    // For demo, just navigate to upload page
    navigate('/upload');
  };

  const nextCard = () => {
    if (!isAnimating) {
      setIsAnimating(true);
      setCurrentCardIndex((prev) => (prev + 1) % sampleCards.length);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const prevCard = () => {
    if (!isAnimating) {
      setIsAnimating(true);
      setCurrentCardIndex((prev) => (prev - 1 + sampleCards.length) % sampleCards.length);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  // Touch handlers for swipe functionality
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && !isAnimating) {
      nextCard();
    }
    if (isRightSwipe && !isAnimating) {
      prevCard();
    }
  };

  const currentCard = sampleCards[currentCardIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Enhanced Hero Section */}
      <LandingHero />

      {/* Feature Highlight Carousel */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              See the Magic in Action
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Every pet is unique, and so are their cards. Explore different styles and rarities.
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto px-4">
            {/* Card Display */}
            <div
              className="flex justify-center items-center mb-8"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className={`transform transition-all duration-300 hover-lift ${isAnimating ? 'scale-95 opacity-50 card-flip-animation' : 'scale-100 opacity-100'}`}>
                <Card className="w-72 h-80 sm:w-80 sm:h-96 bg-gradient-to-br from-white to-gray-50 shadow-2xl border-2 border-gray-200 overflow-hidden">
                  <CardContent className="p-0 h-full flex flex-col">
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 sm:p-4 text-white">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg sm:text-xl font-bold">{currentCard.petName}</h3>
                        <Badge className={`${rarityColors[currentCard.rarity]} text-white capitalize text-xs`}>
                          {currentCard.rarity}
                        </Badge>
                      </div>
                      <p className="text-blue-100 text-xs sm:text-sm">{currentCard.breed}</p>
                    </div>

                    {/* Card Image */}
                    <div className="flex-1 relative overflow-hidden">
                      <img
                        src={currentCard.imageUrl}
                        alt={`${currentCard.petName} - ${currentCard.breed} pet card`}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://via.placeholder.com/400x400/e5e7eb/6b7280?text=${currentCard.petName}`;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      {/* Rarity glow effect */}
                      <div className={`absolute inset-0 opacity-20 ${currentCard.rarity === 'legendary' ? 'bg-yellow-400' : currentCard.rarity === 'epic' ? 'bg-purple-400' : ''}`}></div>
                    </div>

                    {/* Card Footer */}
                    <div className="p-3 sm:p-4 bg-gray-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs sm:text-sm text-gray-600">Style: {currentCard.style}</p>
                          <div className="flex gap-1 mt-1">
                            {currentCard.colors.map((color, index) => (
                              <div
                                key={index}
                                className="w-2 h-2 sm:w-3 sm:h-3 rounded-full border border-gray-300 hover:scale-125 transition-transform"
                                style={{ backgroundColor: color }}
                              ></div>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 sm:w-4 sm:h-4 ${i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Carousel Controls */}
            <div className="flex justify-center items-center gap-4 mb-8">
              <Button
                variant="outline"
                size="sm"
                onClick={prevCard}
                disabled={isAnimating}
                className="rounded-full p-2 hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50"
                aria-label="Previous card"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="flex gap-2" role="tablist" aria-label="Card selection">
                {sampleCards.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => !isAnimating && setCurrentCardIndex(index)}
                    disabled={isAnimating}
                    role="tab"
                    aria-selected={index === currentCardIndex}
                    aria-label={`View card ${index + 1}`}
                    className={`w-2 h-2 rounded-full transition-all duration-300 hover:scale-125 disabled:cursor-not-allowed ${index === currentCardIndex
                        ? 'bg-blue-500 w-6 shadow-lg'
                        : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={nextCard}
                disabled={isAnimating}
                className="rounded-full p-2 hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50"
                aria-label="Next card"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Card Info */}
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Meet {currentCard.petName}
              </h3>
              <p className="text-gray-600 mb-4">
                A {currentCard.rarity} {currentCard.breed} card in {currentCard.style} style
              </p>
              <Button
                onClick={handleSignUp}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                Create Similar Card
                <Sparkles className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Pet Card Generator?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to create, collect, and share amazing pet cards
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Feature 1 */}
            <Card className="p-4 sm:p-6 hover:shadow-lg transition-all duration-300 hover-lift group card-tilt cursor-pointer">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 float-animation group-hover:scale-110 transition-transform icon-bounce">
                  <Upload className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">Easy Upload</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Simply upload a photo of your pet and watch the magic happen. Supports all common image formats.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="p-4 sm:p-6 hover:shadow-lg transition-all duration-300 hover-lift group card-tilt cursor-pointer">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 float-animation group-hover:scale-110 transition-transform icon-bounce" style={{ animationDelay: '0.2s' }}>
                  <Palette className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">Multiple Styles</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Choose from realistic, cartoon, fantasy, and cyberpunk styles to match your pet's personality.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="p-4 sm:p-6 hover:shadow-lg transition-all duration-300 hover-lift group card-tilt cursor-pointer">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4 float-animation group-hover:scale-110 transition-transform icon-bounce" style={{ animationDelay: '0.4s' }}>
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 group-hover:text-yellow-600 transition-colors">Rarity System</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Each card gets a unique rarity level from common to legendary, making every generation exciting.
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="p-4 sm:p-6 hover:shadow-lg transition-all duration-300 hover-lift group card-tilt cursor-pointer">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 float-animation group-hover:scale-110 transition-transform icon-bounce" style={{ animationDelay: '0.6s' }}>
                  <Sparkles className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">Animated Cards</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Get animated GIF versions of your cards that bring your pets to life with smooth animations.
                </p>
              </CardContent>
            </Card>

            {/* Feature 5 */}
            <Card className="p-4 sm:p-6 hover:shadow-lg transition-all duration-300 hover-lift group card-tilt cursor-pointer">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4 float-animation group-hover:scale-110 transition-transform icon-bounce" style={{ animationDelay: '0.8s' }}>
                  <Share2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 group-hover:text-red-600 transition-colors">Easy Sharing</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Download your cards or share them directly to social media to show off your amazing pets.
                </p>
              </CardContent>
            </Card>

            {/* Feature 6 */}
            <Card className="p-4 sm:p-6 hover:shadow-lg transition-all duration-300 hover-lift group card-tilt cursor-pointer">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4 float-animation group-hover:scale-110 transition-transform icon-bounce" style={{ animationDelay: '1s' }}>
                  <Trophy className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">Collection Gallery</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Build your personal collection and track your cards with our beautiful gallery interface.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Loved by Pet Owners Everywhere
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              See what our community is saying about their pet card creations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Testimonial 1 */}
            <Card className="p-6 hover:shadow-lg transition-all duration-300 hover-lift">
              <CardContent className="p-0">
                <div className="flex items-center mb-4">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 mb-4 italic">
                  "I created the most amazing card of my golden retriever! The AI captured her personality perfectly. My friends are all asking how I made it!"
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-semibold">
                    S
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold text-gray-900">Sarah M.</p>
                    <p className="text-sm text-gray-500">Dog Mom</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Testimonial 2 */}
            <Card className="p-6 hover:shadow-lg transition-all duration-300 hover-lift">
              <CardContent className="p-0">
                <div className="flex items-center mb-4">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 mb-4 italic">
                  "The cyberpunk style card of my cat is absolutely incredible! I've already generated 10 different cards and each one is unique and beautiful."
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-400 rounded-full flex items-center justify-center text-white font-semibold">
                    M
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold text-gray-900">Mike R.</p>
                    <p className="text-sm text-gray-500">Cat Dad</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Testimonial 3 */}
            <Card className="p-6 hover:shadow-lg transition-all duration-300 hover-lift">
              <CardContent className="p-0">
                <div className="flex items-center mb-4">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 mb-4 italic">
                  "So easy to use! I uploaded a photo of my rabbit and got the most adorable fantasy-style card. The animations are so smooth and cute!"
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-red-400 rounded-full flex items-center justify-center text-white font-semibold">
                    A
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold text-gray-900">Anna L.</p>
                    <p className="text-sm text-gray-500">Rabbit Owner</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-blue-600 mb-2">10K+</div>
              <div className="text-sm sm:text-base text-gray-600">Cards Created</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-purple-600 mb-2">5K+</div>
              <div className="text-sm sm:text-base text-gray-600">Happy Pet Parents</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-green-600 mb-2">4.9★</div>
              <div className="text-sm sm:text-base text-gray-600">Average Rating</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-yellow-600 mb-2">24/7</div>
              <div className="text-sm sm:text-base text-gray-600">AI Processing</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-r from-blue-600 to-purple-600 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full blur-xl"></div>
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-white rounded-full blur-xl"></div>
          <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white rounded-full blur-xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Create Your First Pet Card?
          </h2>
          <p className="text-lg sm:text-xl text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed">
            Join thousands of pet owners who have already created amazing cards for their furry friends.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <Button
              onClick={handleSignUp}
              disabled={isLoading}
              size="lg"
              className="w-full sm:w-auto bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" text="" />
              ) : (
                <>
                  {user ? 'Start Creating' : 'Sign Up Free'}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>

            <div className="flex flex-col sm:flex-row items-center gap-2 text-blue-100 text-sm">
              <span>No credit card required</span>
              <span className="hidden sm:inline">•</span>
              <span>Free forever</span>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="flex justify-center items-center gap-6 text-blue-200 text-sm">
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4" />
              <span>Fast</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span>Pet-friendly</span>
            </div>
          </div>
        </div>
      </section>

      {/* Onboarding Tooltip */}
      <OnboardingTooltip
        isVisible={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onGetStarted={handleOnboardingGetStarted}
      />

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
};

export default LandingPage;