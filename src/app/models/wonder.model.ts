export interface Wonder {
  id: number;
  name: string;
  type: 'Wonder' | 'Natural Wonder';
  coordinates: [number, number]; // [longitude, latitude]
  wikipedia: string;
  description?: string;
  quote?: string;
  quoteAuthor?: string;
  image?: string;
}
