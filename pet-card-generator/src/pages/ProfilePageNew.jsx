import React, { useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Avatar } from '../components/ui/avatar';
import { Separator } from '../components/ui/separator';
import { 
  Coins, 
  Gem, 
  Crown, 
  Settings, 
  LogOut, 
  Sparkles, 
  TrendingUp, 
  Calendar, 
  Shield 
} from 'lucide-react';

// Sign Out Button Component with Loading State
const SignOutButton = () => {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    
    try {
      // Simulate sign out process
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('User signed out successfully');
      // In a real app, this would redirect to login page or clear auth state
    } catch (error) {
      console.error('Sign out failed:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <button 
      onClick={handleSignOut}
      disabled={isSigningOut}
      className={`flex items-center justify-center gap-2 sm:gap-3 font-medium py-3 px-4 sm:px-6 rounded-lg transition-all duration-300 border ${
        isSigningOut 
          ? 'bg-red-500/20 border-red-400/30 text-red-300 cursor-not-allowed' 
          : 'bg-red-500/10 hover:bg-red-500/20 border-red-400/20 hover:border-red-400/30 text-red-300 hover:text-red-200 transform hover:scale-105'
      }`}
    >
      {isSigningOut ? (
        <>
          <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-red-300/30 border-t-red-300 rounded-full animate-spin"></div>
          <span className="text-sm sm:text-base">Signing Out...</span>
        </>
      ) : (
        <>
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-sm sm:text-base">Sign Out</span>
        </>
      )}
    </button>
  );
};

const ProfilePageNew = () => {
  // Mock user data structure with balances, subscription, and usage information
  const mockUserData = {
    displayName: "Trainer Profile",
    email: "trainer@pokepet.com",
    avatar: null, // Will use initials fallback
    coins: 2450,
    gems: 89,
    subscription: {
      status: 'free', // 'free' | 'premium' | 'pro'
      expiresAt: null
    },
    usage: {
      creaturesCreated: 47,
      freeLimit: 50,
      monthlyLimit: null,
      creaturesThisWeek: 8,
      legendaryCount: 3
    },
    joinedDate: "2024-01-15",
    level: 25,
    xp: 1250,
    stats: {
      cardsCollected: 47,
      battlesWon: 23,
      evolutions: 12
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 pt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl">
        {/* Enhanced Profile Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8 border border-white/20 shadow-xl">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            {/* User Avatar with fallback initials */}
            <div className="relative">
              {mockUserData.avatar ? (
                <Avatar className="w-32 h-32">
                  <img src={mockUserData.avatar} alt={mockUserData.displayName} className="w-full h-full object-cover" />
                </Avatar>
              ) : (
                <div className="w-32 h-32 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold">
                  {mockUserData.displayName.charAt(0)}
                </div>
              )}
            </div>
            
            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-2">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">{mockUserData.displayName}</h1>
                
                {/* Subscription Status Badge */}
                <div className="flex justify-center sm:justify-start gap-2">
                  {mockUserData.subscription.status === 'free' && (
                    <Badge className="bg-gray-500/20 text-gray-300 border-gray-400/30 px-3 py-1">
                      <Shield className="w-4 h-4 mr-1" />
                      Free Tier
                    </Badge>
                  )}
                  {mockUserData.subscription.status === 'premium' && (
                    <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-400/30 px-3 py-1">
                      <Crown className="w-4 h-4 mr-1" />
                      Premium
                    </Badge>
                  )}
                  {mockUserData.subscription.status === 'pro' && (
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 px-3 py-1">
                      <Sparkles className="w-4 h-4 mr-1" />
                      Pro
                    </Badge>
                  )}
                </div>
              </div>
              
              <p className="text-purple-200 text-base sm:text-lg mb-3">{mockUserData.email}</p>
              
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-4 mb-4">
                {/* Join Date Badge */}
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 px-3 py-1">
                  <Calendar className="w-4 h-4 mr-1" />
                  Joined {new Date(mockUserData.joinedDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </Badge>
                
                {/* Level Badge */}
                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-400/30 px-3 py-1">
                  🏆 Level {mockUserData.level}
                </Badge>
                
                {/* XP Badge */}
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 px-3 py-1">
                  ⚡ {mockUserData.xp.toLocaleString()} XP
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
          
          {/* Left Column - Balances and Usage */}
          <div className="xl:col-span-2 space-y-6 sm:space-y-8">
            
            {/* Balances Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/20 shadow-xl hover:bg-white/15 transition-all duration-300">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Account Balances</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Coins Balance */}
                <div className="bg-yellow-500/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-yellow-400/20 hover:bg-yellow-500/15 hover:border-yellow-400/30 transition-all duration-300 transform hover:scale-105">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                      <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-yellow-300">Coins</h3>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-yellow-200">
                    {mockUserData.coins.toLocaleString()}
                  </p>
                </div>

                {/* Gems Balance */}
                <div className="bg-purple-500/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-purple-400/20 hover:bg-purple-500/15 hover:border-purple-400/30 transition-all duration-300 transform hover:scale-105">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <Gem className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-purple-300">Gems</h3>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-200">
                    {mockUserData.gems.toLocaleString()}
                  </p>
                </div>

                {/* Subscription Status */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/10 sm:col-span-2 lg:col-span-1 hover:bg-white/10 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                      mockUserData.subscription.status === 'free' 
                        ? 'bg-gray-500/20' 
                        : mockUserData.subscription.status === 'premium'
                        ? 'bg-yellow-500/20'
                        : 'bg-purple-500/20'
                    }`}>
                      {mockUserData.subscription.status === 'free' && <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />}
                      {mockUserData.subscription.status === 'premium' && <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300" />}
                      {mockUserData.subscription.status === 'pro' && <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300" />}
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-white">Subscription</h3>
                  </div>
              
                  {mockUserData.subscription.status === 'free' ? (
                    <div>
                      <p className="text-gray-300 mb-3">Free Tier</p>
                      <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
                        Upgrade Plan
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className={`font-semibold mb-2 ${
                        mockUserData.subscription.status === 'premium' ? 'text-yellow-300' : 'text-purple-300'
                      }`}>
                        {mockUserData.subscription.status === 'premium' ? 'Premium' : 'Pro'} Active
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-green-300 text-sm">Active Subscription</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Usage Statistics Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/20 shadow-xl hover:bg-white/15 transition-all duration-300">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Usage Statistics</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Creatures Created Section */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-blue-300" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-semibold text-white">Creatures Created</h3>
                      <p className="text-3xl sm:text-4xl font-bold text-blue-300 mt-1">
                        {mockUserData.usage.creaturesCreated}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar for Free Tier Users */}
                  {mockUserData.subscription.status === 'free' && (
                    <div className="mt-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-300 text-sm">Free Tier Usage</span>
                        <span className="text-gray-300 text-sm">
                          {mockUserData.usage.creaturesCreated} / {mockUserData.usage.freeLimit}
                        </span>
                      </div>
                      
                      <Progress 
                        value={(mockUserData.usage.creaturesCreated / mockUserData.usage.freeLimit) * 100} 
                        className="h-3 bg-gray-700/50"
                      />
                      
                      {/* Warning Message for 80% Usage */}
                      {(mockUserData.usage.creaturesCreated / mockUserData.usage.freeLimit) >= 0.8 && (
                        <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-400/20 rounded-lg hover:bg-yellow-500/15 transition-all duration-300">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-yellow-500/20 rounded-full flex items-center justify-center">
                              <span className="text-yellow-300 text-xs">⚠️</span>
                            </div>
                            <p className="text-yellow-300 text-sm font-medium">
                              You're approaching your free tier limit. Consider upgrading for unlimited access.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Premium/Pro Unlimited Status */}
                  {(mockUserData.subscription.status === 'premium' || mockUserData.subscription.status === 'pro') && (
                    <div className="mt-6 p-4 bg-green-500/10 border border-green-400/20 rounded-lg hover:bg-green-500/15 transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-green-300" />
                        </div>
                        <div>
                          <p className="text-green-300 font-semibold">Unlimited Access</p>
                          <p className="text-green-200 text-sm">
                            {mockUserData.subscription.status === 'premium' ? 'Premium' : 'Pro'} subscription - no limits!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Weekly Statistics Grid */}
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">This Week</h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {/* Creatures This Week */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300" />
                        </div>
                        <h4 className="text-base sm:text-lg font-semibold text-purple-300">New Creatures</h4>
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-purple-200">
                        {mockUserData.usage.creaturesThisWeek}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">Created this week</p>
                    </div>

                    {/* Legendary Count */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                          <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300" />
                        </div>
                        <h4 className="text-base sm:text-lg font-semibold text-yellow-300">Legendary</h4>
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-yellow-200">
                        {mockUserData.usage.legendaryCount}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">Legendary creatures</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Quick Actions */}
          <div className="xl:col-span-1 space-y-6 sm:space-y-8">
            
            {/* Gaming Statistics Grid */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/20 shadow-xl hover:bg-white/15 transition-all duration-300">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Gaming Stats</h2>
              <div className="grid grid-cols-1 gap-4 sm:gap-6">
                {/* Cards Collected */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <span className="text-lg">🎴</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-purple-300">Cards</h3>
                      <p className="text-xl font-bold text-purple-200">{mockUserData.stats.cardsCollected}</p>
                    </div>
                  </div>
                </div>

                {/* Battles Won */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                      <span className="text-lg">⚔️</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-green-300">Battles</h3>
                      <p className="text-xl font-bold text-green-200">{mockUserData.stats.battlesWon}</p>
                    </div>
                  </div>
                </div>

                {/* Evolutions */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                      <span className="text-lg">✨</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-orange-300">Evolutions</h3>
                      <p className="text-xl font-bold text-orange-200">{mockUserData.stats.evolutions}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Settings and Subscription Management */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8 border border-white/20 shadow-xl hover:bg-white/15 transition-all duration-300">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Account Settings</h2>
          
          {/* Subscription Plan Comparison for Free Users */}
          {mockUserData.subscription.status === 'free' && (
            <div className="mb-6 sm:mb-8">
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Upgrade Your Plan</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Premium Plan */}
                <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-yellow-400/20 hover:from-yellow-500/15 hover:to-orange-500/15 hover:border-yellow-400/30 transition-all duration-300 transform hover:scale-105">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                      <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300" />
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-bold text-yellow-300">Premium</h4>
                      <p className="text-xl sm:text-2xl font-bold text-yellow-200">$9.99<span className="text-sm text-gray-300">/month</span></p>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-6 text-sm text-gray-300">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                      Unlimited creature creation
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                      Priority support
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                      Advanced customization
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                      Monthly bonus gems
                    </li>
                  </ul>
                  <button 
                    onClick={() => console.log('Upgrade to Premium clicked')}
                    className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-semibold py-2 sm:py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                  >
                    Upgrade to Premium
                  </button>
                </div>

                {/* Pro Plan */}
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-purple-400/20 relative hover:from-purple-500/15 hover:to-pink-500/15 hover:border-purple-400/30 transition-all duration-300 transform hover:scale-105">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 px-2 sm:px-3 py-1 text-xs sm:text-sm">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mb-4 mt-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300" />
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-bold text-purple-300">Pro</h4>
                      <p className="text-xl sm:text-2xl font-bold text-purple-200">$19.99<span className="text-sm text-gray-300">/month</span></p>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-6 text-sm text-gray-300">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                      Everything in Premium
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                      AI-powered enhancements
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                      Exclusive legendary templates
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                      Commercial usage rights
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                      Weekly bonus coins & gems
                    </li>
                  </ul>
                  <button 
                    onClick={() => console.log('Upgrade to Pro clicked')}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2 sm:py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                  >
                    Upgrade to Pro
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Subscription Management for Premium Users */}
          {(mockUserData.subscription.status === 'premium' || mockUserData.subscription.status === 'pro') && (
            <div className="mb-6 sm:mb-8">
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Subscription Management</h3>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                      mockUserData.subscription.status === 'premium' ? 'bg-yellow-500/20' : 'bg-purple-500/20'
                    }`}>
                      {mockUserData.subscription.status === 'premium' ? 
                        <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300" /> : 
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300" />
                      }
                    </div>
                    <div>
                      <h4 className={`text-base sm:text-lg font-bold ${
                        mockUserData.subscription.status === 'premium' ? 'text-yellow-300' : 'text-purple-300'
                      }`}>
                        {mockUserData.subscription.status === 'premium' ? 'Premium' : 'Pro'} Plan
                      </h4>
                      <p className="text-gray-300 text-sm">
                        ${mockUserData.subscription.status === 'premium' ? '9.99' : '19.99'}/month
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-300 text-sm font-medium">Active</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <button 
                    onClick={() => console.log('Manage subscription clicked')}
                    className="bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 border border-white/20 hover:border-white/30 transform hover:scale-105"
                  >
                    Manage Subscription
                  </button>
                  <button 
                    onClick={() => console.log('View billing history clicked')}
                    className="bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 border border-white/20 hover:border-white/30 transform hover:scale-105"
                  >
                    Billing History
                  </button>
                </div>
                
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-400/20 rounded-lg">
                  <p className="text-blue-300 text-sm">
                    <strong>Next billing:</strong> {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Separator className="my-6 bg-white/20" />

          {/* Account Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Account Settings Button */}
            <button 
              onClick={() => console.log('Account settings clicked')}
              className="flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-4 sm:px-6 rounded-lg transition-all duration-300 border border-white/20 hover:border-white/30 transform hover:scale-105"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
              Account Settings
            </button>

            {/* Sign Out Button with Loading State */}
            <SignOutButton />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/20 shadow-xl hover:bg-white/15 transition-all duration-300">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Recent Activity</h2>
          <div className="space-y-3">
            {[
              { action: "Created new card", pet: "Fluffy", time: "2 hours ago", type: "create" },
              { action: "Won battle against", opponent: "Dragon Master", time: "5 hours ago", type: "battle" },
              { action: "Evolved", pet: "Sparkles", time: "1 day ago", type: "evolution" },
              { action: "Uploaded new pet", pet: "Shadow", time: "2 days ago", type: "upload" }
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                  activity.type === 'create' ? 'bg-blue-500/20 border border-blue-400/30' :
                  activity.type === 'battle' ? 'bg-red-500/20 border border-red-400/30' :
                  activity.type === 'evolution' ? 'bg-purple-500/20 border border-purple-400/30' :
                  'bg-green-500/20 border border-green-400/30'
                }`}>
                  <span className="text-lg sm:text-xl">
                    {activity.type === 'create' ? '🎨' :
                     activity.type === 'battle' ? '⚔️' :
                     activity.type === 'evolution' ? '✨' : '📸'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm sm:text-base">
                    {activity.action} {activity.pet && <span className="font-semibold text-purple-300">{activity.pet}</span>}
                    {activity.opponent && <span className="font-semibold text-red-300">{activity.opponent}</span>}
                  </p>
                  <p className="text-gray-400 text-xs sm:text-sm mt-1">{activity.time}</p>
                </div>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  activity.type === 'create' ? 'bg-blue-400' :
                  activity.type === 'battle' ? 'bg-red-400' :
                  activity.type === 'evolution' ? 'bg-purple-400' :
                  'bg-green-400'
                }`}></div>
              </div>
            ))}
          </div>
          
          {/* View All Activity Button */}
          <div className="mt-4 sm:mt-6 text-center">
            <button 
              onClick={() => console.log('View all activity clicked')}
              className="bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 sm:px-6 rounded-lg transition-all duration-300 border border-white/20 hover:border-white/30 transform hover:scale-105"
            >
              View All Activity
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePageNew;