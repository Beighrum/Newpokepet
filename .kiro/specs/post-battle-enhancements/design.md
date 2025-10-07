# Design Document

## Overview

The post-battle enhancements system extends the existing battle system with victory celebrations, pet progression mechanics, gem rewards, and improved UI layout. The design builds upon the current `useBattleState` hook and battle components to add engaging post-battle experiences that provide immediate feedback and rewards to players.

## Architecture

### Core Components

1. **Enhanced Battle State Management**
   - Extend `useBattleState` hook with post-battle data
   - Add experience points, leveling, and gem calculations
   - Implement action cleanup to prevent buffering

2. **Victory Celebration System**
   - Fireworks animation component using CSS animations or canvas
   - Conditional rendering based on battle outcome
   - Non-intrusive overlay that doesn't block UI interaction

3. **Pet Progression System**
   - Experience point calculation based on battle difficulty
   - Level-up detection and stat increase calculations
   - Persistent storage of pet progression data

4. **Gem Reward System**
   - Dynamic gem calculation based on opponent type and trainer level
   - Gem theft mechanics for PvP battles
   - Integration with existing user profile/currency system

5. **Enhanced UI Layout**
   - Side-by-side battle log and results containers
   - Responsive design for mobile stacking
   - Level-up popup modal with stat comparisons

## Components and Interfaces

### Extended Battle Types

```typescript
// Extended battle state interface
interface EnhancedBattleState extends BattleState {
  postBattleRewards: {
    experienceGained: number
    gemsEarned: number
    gemsStolen: number
    levelUp: boolean
    statIncreases: StatIncreases | null
  } | null
  celebrationActive: boolean
}

interface StatIncreases {
  attack: number
  defense: number
  hp: number
  previousLevel: number
  newLevel: number
}

interface GemReward {
  baseReward: number
  levelMultiplier: number
  totalEarned: number
  source: 'victory' | 'theft'
}
```

### New Components

1. **FireworksAnimation**
   - Props: `isActive: boolean`, `duration: number`
   - Renders CSS-based fireworks animation overlay
   - Auto-cleanup after animation completes

2. **LevelUpModal**
   - Props: `isOpen: boolean`, `petData: BattleCreature`, `statIncreases: StatIncreases`
   - Displays before/after stats with visual emphasis
   - Animated stat number transitions

3. **PostBattleRewards**
   - Props: `rewards: PostBattleRewards`, `winner: string`
   - Shows experience, gems, and level progression
   - Integrates with existing BattleResults component

4. **EnhancedBattleLayout**
   - Manages side-by-side layout for battle log and results
   - Responsive breakpoints for mobile stacking
   - Replaces current single-column layout

### Enhanced Hook Functions

```typescript
// Extended useBattleState hook
interface EnhancedBattleHook extends BattleHook {
  calculatePostBattleRewards: (winner: string, playerLevel: number, opponentDifficulty: number) => PostBattleRewards
  triggerLevelUp: (creature: BattleCreature, experienceGained: number) => StatIncreases | null
  cleanupBattleActions: () => void
  startVictoryCelebration: () => void
}
```

## Data Models

### Experience and Leveling

```typescript
interface ExperienceCalculation {
  baseExperience: number
  difficultyMultiplier: number
  victoryBonus: number
  totalExperience: number
}

interface LevelProgression {
  currentLevel: number
  currentExperience: number
  experienceToNextLevel: number
  experienceGained: number
  leveledUp: boolean
}
```

### Gem Economy

```typescript
interface GemCalculation {
  baseReward: number
  trainerLevelMultiplier: number
  difficultyBonus: number
  stolenAmount: number
  totalEarned: number
}

interface GemTheft {
  opponentGems: number
  theftPercentage: number
  maxTheftAmount: number
  actualStolen: number
}
```

## Error Handling

### Battle Action Cleanup
- Clear all setTimeout/setInterval timers when battle ends
- Disable action buttons immediately upon battle completion
- Prevent new action queuing during results phase

### Animation Safety
- Graceful fallback if CSS animations not supported
- Cleanup animation elements on component unmount
- Non-blocking animations that don't interfere with UI

### Data Persistence
- Validate experience/level data before saving
- Handle network failures during gem transactions
- Rollback mechanisms for failed progression updates

## Testing Strategy

### Unit Tests
- Experience calculation algorithms
- Gem reward and theft calculations
- Level-up stat increase formulas
- Battle action cleanup functions

### Integration Tests
- Post-battle flow from victory to rewards display
- Side-by-side layout responsiveness
- Animation timing and cleanup
- Data persistence across battle sessions

### User Experience Tests
- Victory celebration timing and visual impact
- Level-up modal usability and clarity
- Gem reward feedback and understanding
- Mobile layout functionality

## Implementation Phases

### Phase 1: Battle Action Cleanup
- Extend useBattleState with cleanup functions
- Implement action button disabling
- Clear pending timers on battle end

### Phase 2: Enhanced Layout
- Create side-by-side battle log and results layout
- Implement responsive design breakpoints
- Update BattlePageNew component structure

### Phase 3: Victory Celebrations
- Implement FireworksAnimation component
- Add celebration trigger to battle completion
- Integrate with existing victory flow

### Phase 4: Pet Progression
- Add experience calculation system
- Implement level-up detection and stat increases
- Create LevelUpModal component

### Phase 5: Gem Rewards
- Implement gem calculation algorithms
- Add gem theft mechanics for PvP
- Integrate with user profile/currency system

## Performance Considerations

### Animation Performance
- Use CSS transforms and opacity for smooth animations
- Implement requestAnimationFrame for complex animations
- Lazy load animation assets

### State Management
- Minimize re-renders during post-battle calculations
- Use React.memo for expensive components
- Debounce rapid state updates

### Data Storage
- Batch multiple progression updates
- Use optimistic updates for immediate feedback
- Implement caching for frequently accessed data

## Security Considerations

### Gem Economy
- Server-side validation of gem transactions
- Rate limiting for battle completion
- Anti-cheat measures for experience/level manipulation

### Data Integrity
- Validate all progression calculations server-side
- Implement checksums for critical battle data
- Audit logging for suspicious activity patterns