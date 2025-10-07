# Enhanced Profile Page Design

## Overview

The enhanced profile page combines the existing gaming-focused sections (cards collected, battles won, evolutions, recent activity) with advanced account management features (balances, usage statistics, subscription management, account settings). The design maintains the current glassmorphism aesthetic while organizing content in a logical, user-friendly layout.

## Architecture

### Component Structure
```
ProfilePageNew
├── ProfileHeader (enhanced with subscription badges and join date)
├── BalancesCard (new - coins, gems, subscription status)
├── UsageStatisticsCard (new - creature creation tracking)
├── GamingStatsGrid (existing - cards, battles, evolutions)
├── AccountSettingsCard (new - subscription management, account actions)
└── RecentActivityCard (existing - activity feed)
```

### Layout Organization
The page uses a responsive grid system:
- **Mobile**: Single column layout with stacked cards
- **Tablet**: 2-column grid for balanced content distribution  
- **Desktop**: Mixed layout with header spanning full width, then 2-3 column sections

## Components and Interfaces

### Enhanced Profile Header
**Purpose**: Display user identity with subscription status and achievements
**Location**: Top of page, full width
**Content**:
- User avatar (image or initials in gradient circle)
- Display name and email
- Subscription badge (Free Tier/Premium/Pro with appropriate icons)
- Join date badge
- Level and XP information (existing)

### Balances Card
**Purpose**: Show user's in-game currency and subscription status
**Location**: Left column, first row after header
**Content**:
- Coins balance with yellow accent and coin icon
- Gems balance with purple accent and gem icon
- Current subscription status
- Upgrade button for free tier users
- Active subscription indicator for premium users

### Usage Statistics Card  
**Purpose**: Track creature creation and usage limits
**Location**: Right column, first row after header
**Content**:
- Total creatures created counter
- Progress bar for free tier limits (with warning at 80%)
- Monthly limit display for premium users
- Weekly statistics grid (creatures this week, legendary count)

### Gaming Stats Grid
**Purpose**: Maintain existing gaming achievements display
**Location**: Second row, spans 2-3 columns based on screen size
**Content**: 
- Cards Collected counter
- Battles Won counter  
- Evolutions counter
- Consistent styling with new cards

### Account Settings Card
**Purpose**: Subscription management and account actions
**Location**: Third row, full width
**Content**:
- Subscription plan comparison (for free users)
- Active subscription management (for premium users)
- Account settings button
- Sign out button with loading state

### Recent Activity Card
**Purpose**: Maintain existing activity feed
**Location**: Bottom section, full width
**Content**: Existing recent activity list with consistent styling

## Data Models

### User Profile Model
```typescript
interface UserProfile {
  displayName: string
  email: string
  avatar?: string
  coins: number
  gems: number
  subscription: {
    status: 'free' | 'premium' | 'pro'
    expiresAt?: Date
  }
  usage: {
    creaturesCreated: number
    freeLimit: number
    monthlyLimit: number
  }
  joinedDate: string
  level: number
  xp: number
  stats: {
    cardsCollected: number
    battlesWon: number
    evolutions: number
  }
}
```

### Activity Item Model
```typescript
interface ActivityItem {
  action: string
  pet?: string
  opponent?: string
  time: string
  type: 'create' | 'battle' | 'evolution' | 'upload'
}
```

## Error Handling

### Data Loading States
- Show skeleton loaders for each card section while data loads
- Display fallback values (0 for counters) if data fails to load
- Graceful degradation for missing user avatar or profile information

### Subscription Actions
- Handle upgrade flow errors with user-friendly messages
- Validate subscription status before showing premium features
- Provide retry mechanisms for failed subscription operations

### Sign Out Process
- Show loading state during sign out process
- Handle sign out failures with appropriate error messages
- Ensure secure session termination

## Testing Strategy

### Unit Testing
- Test user profile data rendering with various subscription states
- Verify currency formatting and display logic
- Test usage progress calculations and warning thresholds
- Validate subscription badge rendering logic

### Integration Testing  
- Test subscription upgrade flow integration
- Verify sign out process with authentication system
- Test responsive layout behavior across device sizes
- Validate data loading and error states

### Visual Testing
- Verify glassmorphism styling consistency across all new cards
- Test color coding for different elements (coins, gems, subscription badges)
- Validate responsive grid behavior and card arrangements
- Ensure accessibility compliance for all interactive elements

## Implementation Notes

### Styling Approach
- Maintain existing Tailwind CSS classes and design tokens
- Use consistent backdrop-blur and border styling for new cards
- Implement proper color coding: yellow for coins, purple for gems, green for active subscriptions
- Ensure responsive design with appropriate breakpoints

### State Management
- Integrate with existing user authentication system
- Handle subscription status updates in real-time
- Manage loading states for async operations
- Implement proper error boundaries for component failures

### Performance Considerations
- Lazy load subscription plan data only when needed
- Optimize image loading for user avatars
- Implement proper memoization for expensive calculations
- Use efficient re-rendering strategies for dynamic content