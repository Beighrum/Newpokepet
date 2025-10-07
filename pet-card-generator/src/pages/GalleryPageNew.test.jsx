import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import GalleryPageNew from './GalleryPageNew'

// Mock the gallery data transform function
vi.mock('@/lib/gallery-data-transform', () => ({
  transformCardToCreature: vi.fn((card) => ({
    id: card.id.toString(),
    name: card.name,
    element: 'Bolt',
    rarity: card.rarity,
    stage: 'Adult',
    level: card.level,
    xp: card.xp,
    stats: { heart: 50, speed: 60, power: 70, focus: 40 },
    personality: ['Energetic', 'Bold'],
    prompt: '',
    imageUrl: card.image,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'ready',
    ownerUid: 'test-user',
    parentId: null,
    moves: []
  })),
  validateCardData: vi.fn((card) => {
    // Mock validation - return true for valid cards
    return card && card.id && card.name && card.type && card.level && card.xp !== undefined
  }),
  transformCardToCreatureAdvanced: vi.fn((card) => ({
    id: card.id.toString(),
    name: card.name,
    element: 'Bolt',
    rarity: card.rarity,
    stage: 'Adult',
    level: card.level,
    xp: card.xp,
    stats: { heart: 50, speed: 60, power: 70, focus: 40 },
    personality: ['Energetic', 'Bold'],
    prompt: '',
    imageUrl: card.image,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'ready',
    ownerUid: 'test-user',
    parentId: null,
    moves: []
  }))
}))

// Mock the CreatureDialog component
vi.mock('@/components/creature-dialog', () => ({
  CreatureDialog: ({ creature, open, onOpenChange }) => (
    open ? (
      <div data-testid="creature-dialog">
        <h2>{creature?.name} Stats</h2>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null
  )
}))

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('GalleryPageNew Click Handlers', () => {
  test('clicking on a card opens the stats modal', () => {
    renderWithRouter(<GalleryPageNew />)
    
    // Find the first pet card (Golden Thunder)
    const cardElement = screen.getByText('Golden Thunder').closest('.group')
    expect(cardElement).toBeInTheDocument()
    
    // Initially, modal should not be visible
    expect(screen.queryByTestId('creature-dialog')).not.toBeInTheDocument()
    
    // Click on the card
    fireEvent.click(cardElement)
    
    // Modal should now be visible with the creature's name
    expect(screen.getByTestId('creature-dialog')).toBeInTheDocument()
    expect(screen.getByText('Golden Thunder Stats')).toBeInTheDocument()
  })

  test('closing the modal clears the selected creature', () => {
    renderWithRouter(<GalleryPageNew />)
    
    // Click on a card to open modal
    const cardElement = screen.getByText('Fire Corgi').closest('.group')
    fireEvent.click(cardElement)
    
    // Modal should be visible
    expect(screen.getByTestId('creature-dialog')).toBeInTheDocument()
    
    // Click close button
    const closeButton = screen.getByText('Close')
    fireEvent.click(closeButton)
    
    // Modal should be closed
    expect(screen.queryByTestId('creature-dialog')).not.toBeInTheDocument()
  })

  test('cards have cursor pointer styling', () => {
    renderWithRouter(<GalleryPageNew />)
    
    const cardElement = screen.getByText('Water Lab').closest('.group')
    expect(cardElement).toHaveClass('cursor-pointer')
  })

  test('hover effects are preserved', () => {
    renderWithRouter(<GalleryPageNew />)
    
    const cardElement = screen.getByText('Golden Thunder').closest('.group')
    expect(cardElement).toHaveClass('hover:shadow-2xl')
    expect(cardElement).toHaveClass('hover:-translate-y-2')
  })
})