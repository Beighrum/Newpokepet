export const db = {
  // Mock Firestore methods
  collection: () => ({
    doc: () => ({
      get: () => Promise.resolve({ exists: false, data: () => null }),
      set: () => Promise.resolve(),
      update: () => Promise.resolve(),
      onSnapshot: (callback: any) => {
        // Return mock data after a short delay
        setTimeout(() => {
          callback({
            exists: true,
            data: () => ({
              id: "mock-card-1",
              name: "Sparkle Pup",
              status: "ready",
              imageUrl: "/golden-retriever-pokemon-lightning.png",
              element: "electric",
              rarity: "rare",
              stage: "baby",
              xp: 75,
              maxXp: 100,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          })
        }, 1000)

        // Return unsubscribe function
        return () => {}
      },
    }),
    where: () => ({
      orderBy: () => ({
        onSnapshot: (callback: any) => {
          // Return mock cards collection
          setTimeout(() => {
            callback({
              docs: [
                {
                  id: "mock-1",
                  data: () => ({
                    id: "mock-1",
                    name: "Thunder Pup",
                    status: "ready",
                    imageUrl: "/golden-retriever-pokemon-lightning.png",
                    element: "electric",
                    rarity: "rare",
                    stage: "baby",
                    xp: 75,
                    maxXp: 100,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  }),
                },
                {
                  id: "mock-2",
                  data: () => ({
                    id: "mock-2",
                    name: "Mystic Cat",
                    status: "processing",
                    imageUrl: "/psychic-persian-pokemon.png",
                    element: "psychic",
                    rarity: "legendary",
                    stage: "adult",
                    xp: 45,
                    maxXp: 150,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  }),
                },
              ],
            })
          }, 500)

          return () => {}
        },
      }),
    }),
  }),
}

export const functions = {
  // Mock functions
  httpsCallable: (name: string) => {
    return (data: any) => {
      console.log(`Mock Firebase function called: ${name}`, data)
      return Promise.resolve({
        data: {
          success: true,
          cardId: `mock-${Date.now()}`,
          message: `Mock ${name} completed successfully`,
        },
      })
    }
  },
}

export const auth = {
  // Mock auth
  currentUser: {
    uid: "mock-user-123",
    email: "demo@example.com",
    displayName: "Demo User",
  },
  onAuthStateChanged: (callback: any) => {
    callback({
      uid: "mock-user-123",
      email: "demo@example.com",
      displayName: "Demo User",
    })
    return () => {}
  },
}
