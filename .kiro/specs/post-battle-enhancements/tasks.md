# Implementation Plan

- [x] 1. Extend battle state management for post-battle features
  - Add post-battle reward data structures to battle types
  - Extend useBattleState hook with cleanup and reward calculation functions
  - Implement action cleanup to prevent buffering after battle ends
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.1 Update battle types with post-battle data structures
  - Add EnhancedBattleState interface extending current BattleState
  - Create PostBattleRewards, StatIncreases, and GemReward interfaces
  - Add ExperienceCalculation and LevelProgression type definitions
  - _Requirements: 4.1, 5.1, 6.1_

- [x] 1.2 Extend useBattleState hook with cleanup functions
  - Add cleanupBattleActions function to clear timers and disable actions
  - Implement battle action state management to prevent post-battle buffering
  - Add postBattleRewards state and setter functions
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.3 Write unit tests for battle state cleanup
  - Test action cleanup functionality
  - Verify timer clearing and button disabling
  - Test post-battle state transitions
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Create enhanced battle layout with side-by-side containers
  - Modify BattlePageNew component to use side-by-side layout for battle log and results
  - Implement responsive design that stacks containers on mobile
  - Update CSS classes and grid layouts for proper spacing
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2.1 Update BattlePageNew component layout structure
  - Modify the battle results section to use side-by-side grid layout
  - Implement responsive breakpoints for mobile stacking
  - Ensure battle log remains accessible and scrollable in new layout
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2.2 Update BattleLog component for side-by-side display
  - Adjust component styling for side-by-side layout compatibility
  - Ensure proper scrolling behavior in constrained width
  - Maintain accessibility features in new layout
  - _Requirements: 2.1, 2.2_

- [x] 3. Implement victory celebration with fireworks animation
  - Create FireworksAnimation component with CSS-based animations
  - Add celebration trigger logic to battle completion flow
  - Integrate fireworks display with existing victory results
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3.1 Create FireworksAnimation component
  - Build CSS-based fireworks animation using keyframes and transforms
  - Implement component with isActive prop and auto-cleanup after duration
  - Ensure animation doesn't interfere with UI readability
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3.2 Integrate fireworks with battle completion flow
  - Add celebration trigger to useBattleState hook for player victories
  - Modify BattleResults component to conditionally render fireworks
  - Ensure fireworks only display for player wins, not defeats
  - _Requirements: 3.1, 3.4_

- [x] 4. Implement pet leveling and experience system
  - Add experience calculation functions based on battle difficulty
  - Create level-up detection and stat increase calculations
  - Implement LevelUpModal component to display progression
  - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4_

- [x] 4.1 Create experience and leveling calculation functions
  - Implement calculateExperience function with difficulty multipliers
  - Add checkLevelUp function to detect when pets level up
  - Create calculateStatIncreases function for level-up bonuses
  - _Requirements: 4.1, 4.2, 5.1, 5.2_

- [x] 4.2 Create LevelUpModal component
  - Build modal component to display before/after stat comparisons
  - Implement animated stat number transitions for visual appeal
  - Add proper accessibility attributes and keyboard navigation
  - _Requirements: 4.3, 5.1, 5.3, 5.4_

- [x] 4.3 Integrate leveling system with battle completion
  - Add level-up checks to post-battle reward calculations
  - Trigger LevelUpModal when pets gain levels
  - Update pet data persistence with new levels and stats
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 4.4 Write unit tests for experience and leveling system
  - Test experience calculation with various difficulty levels
  - Verify level-up detection and stat increase calculations
  - Test edge cases like maximum level and zero experience
  - _Requirements: 4.1, 4.2, 5.1, 5.2_

- [x] 5. Implement gem reward and theft system
  - Create gem calculation functions based on opponent type and trainer level
  - Implement gem theft mechanics for PvP battles
  - Add gem reward display to post-battle results
  - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4_

- [x] 5.1 Create gem calculation and reward functions
  - Implement calculateGemReward function with trainer level multipliers
  - Add calculateGemTheft function for PvP gem stealing mechanics
  - Create gem reward validation and capping logic
  - _Requirements: 6.1, 6.2, 7.1, 7.2, 7.3, 8.1, 8.2_

- [x] 5.2 Create PostBattleRewards component
  - Build component to display experience, gems, and progression rewards
  - Show separate base rewards and level bonuses for transparency
  - Integrate with existing BattleResults component layout
  - _Requirements: 6.3, 8.3, 8.4_

- [x] 5.3 Integrate gem system with battle completion
  - Add gem calculations to post-battle reward processing
  - Implement different logic for AI vs PvP opponents
  - Update user gem totals and persist changes
  - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.4_

- [x] 5.4 Write unit tests for gem reward system
  - Test gem calculation with various trainer levels and difficulties
  - Verify gem theft calculations and capping mechanisms
  - Test AI vs PvP reward differences
  - _Requirements: 6.1, 6.2, 7.1, 7.2, 7.3, 8.1, 8.2_

- [x] 6. Integrate all post-battle enhancements into battle flow
  - Connect all new components and systems with existing battle state
  - Implement proper sequencing of celebrations, level-ups, and rewards
  - Add comprehensive error handling and fallback states
  - _Requirements: All requirements_

- [x] 6.1 Update BattleResults component with all enhancements
  - Integrate FireworksAnimation, LevelUpModal, and PostBattleRewards
  - Implement proper component sequencing and state management
  - Ensure all post-battle features work together seamlessly
  - _Requirements: All requirements_

- [x] 6.2 Add comprehensive error handling
  - Implement fallback states for animation failures
  - Add error boundaries for post-battle calculation failures
  - Create graceful degradation for network issues during reward processing
  - _Requirements: All requirements_

- [x] 6.3 Write integration tests for complete post-battle flow
  - Test full battle completion to rewards display flow
  - Verify proper sequencing of celebrations, level-ups, and gem rewards
  - Test error handling and fallback scenarios
  - _Requirements: All requirements_
