import React from 'react';
import { Badge } from '@/components/ui/badge';

const samplePets = [
  {
    name: "Golden Thunder",
    type: "Lightning",
    rarity: "Legendary",
    image: "/golden-retriever-pokemon-lightning.png",
    rarityColor: "bg-yellow-400 text-yellow-900"
  },
  {
    name: "Fire Corgi",
    type: "Fire",
    rarity: "Epic",
    image: "/fire-corgi-pokemon.png",
    rarityColor: "bg-red-400 text-red-900"
  },
  {
    name: "Grass Kitten",
    type: "Grass",
    rarity: "Rare",
    image: "/grass-kitten-pokemon.png",
    rarityColor: "bg-green-400 text-green-900"
  },
  {
    name: "Water Lab",
    type: "Water",
    rarity: "Uncommon",
    image: "/labrador-pokemon-water.png",
    rarityColor: "bg-blue-400 text-blue-900"
  },
  {
    name: "Psychic Persian",
    type: "Psychic",
    rarity: "Rare",
    image: "/psychic-persian-pokemon.png",
    rarityColor: "bg-purple-400 text-purple-900"
  },
  {
    name: "Dark Wolf",
    type: "Dark",
    rarity: "Epic",
    image: "/dark-wolf-pokemon.png",
    rarityColor: "bg-gray-700 text-white"
  }
];

const getRarityColor = (rarity) => {
  switch (rarity?.toLowerCase()) {
    case 'common': return 'bg-gray-400 text-gray-900';
    case 'uncommon': return 'bg-green-400 text-green-900';
    case 'rare': return 'bg-blue-400 text-blue-900';
    case 'epic': return 'bg-purple-400 text-purple-900';
    case 'legendary': return 'bg-yellow-400 text-yellow-900';
    default: return 'bg-gray-400 text-gray-900';
  }
};

const PetGalleryPreview = ({ cards = [], showSamples = true }) => {
  const displayCards = cards.length > 0 ? cards : (showSamples ? samplePets : []);
  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Amazing Pet Transformations
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            See how our AI transforms real pets into incredible collectible creatures
          </p>
        </div>

        {displayCards.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {displayCards.map((pet, index) => (
              <div
                key={pet.id || index}
                className="group relative bg-white rounded-2xl p-3 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer"
              >
                <div className="aspect-[3/4] bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl overflow-hidden relative">
                  <img
                    src={pet.image || pet.images?.processed || pet.images?.original}
                    alt={`${pet.name || pet.petName} - ${pet.type || pet.petType} type card`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/200x250/e5e7eb/6b7280?text=" + (pet.name || pet.petName || 'Pet');
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  <Badge className={`absolute top-2 right-2 text-xs ${pet.rarityColor || getRarityColor(pet.rarity)} rounded-full`}>
                    {pet.rarity}
                  </Badge>
                </div>
                
                <div className="mt-3 text-center">
                  <h3 className="font-semibold text-gray-900 text-sm group-hover:text-purple-600 transition-colors">
                    {pet.name || pet.petName}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">{pet.type || pet.petType} Type</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No cards to display yet</p>
            <p className="text-gray-400 mt-2">Upload your first pet photo to get started!</p>
          </div>
        )}

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-6">Ready to transform your pet?</p>
          <button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            Start Creating Now
          </button>
        </div>
      </div>
    </section>
  );
};

export { PetGalleryPreview };
export default PetGalleryPreview;