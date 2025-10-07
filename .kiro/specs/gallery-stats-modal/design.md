# Design Document

## Overview

The gallery stats modal feature enhances the existing gallery page by adding interactive click functionality to pet card containers. When users click on any pet card, a modal dialog opens displaying comprehensive statistics and information about the selected pet. The implementation leverages the existing `CreatureDialog` component and integrates seamlessly with the current gallery layout without modifying container dimensions.

## Architecture

### Component Integration
- **Existing Gallery Page**: The current `GalleryPageNew.jsx` serves as the base component
- **Modal Component**: Utilize the existing `CreatureDialog` component for consistent UI/UX
- **State Management**: Add local state to track selected creature and modal visibility
- **Event Handling**: Implement click handlers on card containers to trigger modal display

### Data Flow
1. User clicks on a pet card container in the gallery
2. Click handler captures the card data and sets it as the selected creature
3. Modal state is updated to show the dialog
4. `CreatureDialog` component renders with the selected creature data
5. User can close modal via close button, escape key, or clicking outside

## Components and Interfaces

### Modified Gallery Component
```typescript
interface GalleryState {
  selectedCreature: Creature | null
  isModalOpen: boolean
}

interface ClickHandler {
  onCardClick: (creature: Creature) => void
  onModalClose: () => void
}
```

### Data Transformation
The existing card data structure needs to be mapped to the `Creature` interface expected by `CreatureDialog`:

```typescript
interface CardToCreatureMapping {
  // Gallery card properties -> CreatureDialog properties
  id: string -> id: string
  name: string -> name: string
  type: string -> element: ElementKey
  rarity: string -> rarity: Rarity
  image: string -> imageUrl: string
  level: number -> level: number
  xp: number -> xp: number
  // Additional properties with defaults
  stats: Stats (generated defaults)
  personality: string[] (generated defaults)
  moves: Move[] (generated defaults)
}
```

### Event Handling Design
- **Click Events**: Add `onClick` handlers to existing card containers
- **Keyboard Navigation**: Leverage existing `CreatureDialog` keyboard support (Escape to close, arrow keys for tabs)
- **Accessibility**: Maintain existing ARIA labels and screen reader support

## Data Models

### Enhanced Card Interface
```typescript
interface EnhancedCard {
  id: string
  name: string
  type: string
  rarity: string
  image: string
  level: number
  xp: number
  maxXp?: number
  // Optional extended stats for modal display
  stats?: {
    heart: number
    speed: number
    power: number
    focus: number
  }
  personality?: string[]
  moves?: Move[]
}
```

### Modal State Interface
```typescript
interface ModalState {
  isOpen: boolean
  selectedCreature: Creature | null
}
```

## Error Handling

### Image Loading Errors
- Maintain existing fallback image logic in both gallery and modal
- Ensure consistent placeholder behavior across components

### Data Validation
- Validate card data before passing to modal
- Provide default values for missing optional properties
- Handle cases where card data is incomplete or corrupted

### Modal State Errors
- Prevent modal from opening with null/undefined creature data
- Handle modal close events gracefully
- Ensure proper cleanup of event listeners

## Testing Strategy

### Unit Testing
- Test click handler functionality
- Verify data transformation from card to creature format
- Test modal open/close state management
- Validate keyboard event handling

### Integration Testing
- Test complete user flow: click card → modal opens → view stats → close modal
- Verify modal behavior with different card types and rarities
- Test responsive behavior on different screen sizes
- Validate accessibility features (keyboard navigation, screen readers)

### Visual Testing
- Ensure modal appearance is consistent with existing design system
- Verify container dimensions remain unchanged in gallery
- Test modal positioning and overlay behavior
- Validate responsive design on mobile devices

## Implementation Details

### State Management
```typescript
const [selectedCreature, setSelectedCreature] = useState<Creature | null>(null)
const [isModalOpen, setIsModalOpen] = useState(false)

const handleCardClick = (card: Card) => {
  const creature = transformCardToCreature(card)
  setSelectedCreature(creature)
  setIsModalOpen(true)
}

const handleModalClose = () => {
  setIsModalOpen(false)
  setSelectedCreature(null)
}
```

### Data Transformation Logic
```typescript
const transformCardToCreature = (card: Card): Creature => {
  return {
    id: card.id,
    name: card.name,
    element: mapTypeToElement(card.type),
    rarity: card.rarity as Rarity,
    imageUrl: card.image,
    level: card.level,
    xp: card.xp,
    stats: card.stats || generateDefaultStats(card.level),
    personality: card.personality || generateDefaultPersonality(),
    moves: card.moves || generateDefaultMoves(card.type),
    // Additional required properties with sensible defaults
    ownerUid: 'current-user',
    stage: determineStageFromLevel(card.level),
    prompt: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'ready'
  }
}
```

### Responsive Design Considerations
- Modal adapts to screen size using existing `CreatureDialog` responsive behavior
- Gallery grid layout remains unchanged
- Touch interactions work seamlessly on mobile devices
- Modal content scrolls appropriately on smaller screens

### Performance Optimization
- Lazy load modal component only when needed
- Minimize re-renders by using proper dependency arrays
- Optimize image loading in modal with existing error handling
- Use React.memo for card components if performance issues arise

## Security Considerations

### Data Sanitization
- Leverage existing sanitization utilities for user-generated content
- Validate image URLs before displaying in modal
- Sanitize card names and descriptions to prevent XSS

### Access Control
- Ensure users can only view their own pet cards
- Validate card ownership before displaying in modal
- Maintain existing authentication checks