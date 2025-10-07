# Implementation Plan

- [x] 1. Set up enhanced profile page structure and imports
  - Update ProfilePageNew.jsx with necessary UI component imports (Badge, Progress, Avatar, Separator)
  - Add required Lucide React icons (Coins, Gem, Crown, Settings, LogOut, Sparkles, TrendingUp, Calendar, Shield)
  - Create mock user data structure with balances, subscription, and usage information
  - _Requirements: 1.1, 4.4, 5.1_

- [x] 2. Enhance profile header with subscription and account information
  - Modify existing profile header to include user avatar with fallback initials
  - Add subscription status badge with conditional rendering (Free/Premium/Pro)
  - Integrate join date badge with calendar icon
  - Maintain existing level and XP display alongside new elements
  - _Requirements: 1.3, 1.4, 1.5, 1.6, 4.4, 4.5_

- [x] 3. Implement balances card component
  - Create new card section displaying coins balance with yellow styling and coin icon
  - Add gems balance display with purple styling and gem icon
  - Implement subscription status section with conditional upgrade button or active indicator
  - Add proper currency formatting and visual hierarchy
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.3_

- [x] 4. Build usage statistics card component
  - Create creatures created counter with prominent display
  - Implement progress bar for free tier users showing usage against limits
  - Add warning message display when usage exceeds 80% of free limit
  - Create weekly statistics grid showing creatures this week and legendary count
  - Add conditional rendering for premium/pro unlimited status
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.3_

- [x] 5. Integrate account settings and subscription management
  - Create account settings card with subscription plan comparison for free users
  - Implement upgrade buttons with click handlers for subscription plans
  - Add active subscription management section for premium users
  - Create sign out functionality with loading state and proper button styling
  - Add account settings navigation button
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 6. Maintain existing gaming statistics and activity sections
  - Preserve existing gaming stats grid (cards collected, battles won, evolutions) with updated styling
  - Ensure recent activity section maintains current functionality with consistent card styling
  - Update grid layout to accommodate new sections while keeping existing content
  - Apply consistent glassmorphism styling across all sections
  - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2_

- [x] 7. Implement responsive layout and visual consistency
  - Create responsive grid system that works across mobile, tablet, and desktop
  - Apply consistent backdrop-blur and border styling to all new card components
  - Implement proper color coding throughout (yellow for coins, purple for gems, etc.)
  - Ensure proper spacing and alignment between existing and new sections
  - Add hover effects and interactive states for all buttons and clickable elements
  - _Requirements: 4.3, 5.1, 5.2, 5.4, 5.5, 5.6_

- [ ]* 8. Add comprehensive testing coverage
  - Write unit tests for subscription badge rendering logic
  - Create tests for usage progress calculations and warning thresholds
  - Add tests for currency formatting and display functions
  - Test responsive layout behavior across different screen sizes
  - _Requirements: 2.3, 5.3, 5.4_

- [ ]* 9. Implement error handling and loading states
  - Add skeleton loaders for each card section during data loading
  - Implement fallback displays for missing or failed data loads
  - Create error boundaries for subscription-related operations
  - Add proper error messaging for failed upgrade attempts
  - _Requirements: 3.2, 3.4_
