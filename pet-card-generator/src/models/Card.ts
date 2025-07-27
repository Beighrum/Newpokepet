export type CardRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'secret_rare';

export interface CardImage {
  originalUrl: string;
  processedUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  format: string;
  fileSize: number;
}

export interface CardStats {
  attack: number;
  defense: number;
  speed: number;
  health: number;
  totalPower: number;
}

export interface Card {
  id: string;
  userId: string;
  petName: string;
  petType: string;
  rarity: CardRarity;
  image: CardImage;
  stats: CardStats;
  tags: string[];
  isFavorite: boolean;
  shareCount: number;
  downloadCount: number;
  createdAt: number;
  updatedAt: number;
}

export default Card;