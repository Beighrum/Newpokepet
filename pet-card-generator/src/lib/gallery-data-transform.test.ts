import { 
  transformCardToCreature, 
  transformCardToCreatureAdvanced,
  mapTypeToElement, 
  generateDefaultStats, 
  generateDefaultPersonality,
  validateCardData
} from './gallery-data-transform'

// Test data matching the sample cards from GalleryPageNew.jsx
const testCard = {
  id: 1,
  name: "Golden Thunder",
  type: "Lightning", 
  rarity: "Legendary",
  image: "/golden-retriever-pokemon-lightning.png",
  level: 15,
  xp: 850
}

describe('Gallery Data Transform', () => {
  test('mapTypeToElement converts Lightning to Bolt', () => {
    expect(mapTypeToElement('Lightning')).toBe('Bolt')
    expect(mapTypeToElement('Fire')).toBe('Fire')
    expect(mapTypeToElement('Water')).toBe('Water')
  })

  test('generateDefaultStats creates valid stats', () => {
    const stats = generateDefaultStats(15)
    expect(stats.heart).toBeGreaterThan(0)
    expect(stats.speed).toBeGreaterThan(0)
    expect(stats.power).toBeGreaterThan(0)
    expect(stats.focus).toBeGreaterThan(0)
  })

  test('generateDefaultPersonality returns array of traits', () => {
    const personality = generateDefaultPersonality('Bolt', 'Legendary')
    expect(Array.isArray(personality)).toBe(true)
    expect(personality.length).toBeGreaterThan(0)
  })

  test('validateCardData validates required fields', () => {
    expect(validateCardData(testCard)).toBe(true)
    expect(validateCardData({ ...testCard, name: undefined as any })).toBe(false)
  })

  test('transformCardToCreature creates valid creature', () => {
    const creature = transformCardToCreature(testCard)
    expect(creature.name).toBe('Golden Thunder')
    expect(creature.element).toBe('Bolt')
    expect(creature.level).toBe(15)
    expect(creature.rarity).toBe('Legendary')
    expect(creature.stats).toBeDefined()
    expect(creature.personality).toBeDefined()
    expect(creature.moves).toBeDefined()
  })

  test('transformCardToCreatureAdvanced handles validation', () => {
    const validCreature = transformCardToCreatureAdvanced(testCard)
    expect(validCreature).not.toBeNull()
    expect(validCreature?.name).toBe('Golden Thunder')

    const invalidCreature = transformCardToCreatureAdvanced({ ...testCard, level: -1 })
    expect(invalidCreature).toBeNull()
  })
})