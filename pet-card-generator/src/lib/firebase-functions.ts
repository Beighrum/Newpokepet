export interface CardGenerationRequest {
  bytes: ArrayBuffer
  fileName: string
  contentType: string
  design: {
    type?: string
    rarity?: string
    appearance?: string
    personalities?: string[]
  }
  prompt: string
}

export interface CardGenerationResponse {
  cardId: string
}

export interface CardEvolutionRequest {
  cardId: string
  targetStage: "adult" | "elder"
}

export interface CardEvolutionResponse {
  ok: boolean
}

// Mock implementation for card generation
export const startCardGeneration = async (
  bytes: ArrayBuffer,
  fileName: string,
  contentType: string,
  design: CardGenerationRequest["design"],
  prompt: string,
): Promise<CardGenerationResponse> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  try {
    // Mock successful generation
    const cardId = `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return { cardId }
  } catch (error) {
    console.error("Card generation failed:", error)
    throw new Error("Failed to start card generation")
  }
}

// Mock implementation for card evolution
export const startCardEvolution = async (
  cardId: string,
  targetStage: "adult" | "elder",
): Promise<CardEvolutionResponse> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 2000))

  try {
    // Mock successful evolution (95% success rate for better UX in preview)
    const success = Math.random() > 0.05

    if (success) {
      console.log(`Mock evolution: Card ${cardId} evolved to ${targetStage}`)
      return { ok: true }
    } else {
      throw new Error("Evolution failed - try again")
    }
  } catch (error) {
    console.error("Card evolution failed:", error)
    throw error
  }
}
