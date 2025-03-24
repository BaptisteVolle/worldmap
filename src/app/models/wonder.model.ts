export interface Wonder {
  id: number;
  name: string;
  type: 'Wonder' | 'Natural Wonder';
  coordinates: [number, number];
  wikipedia: string;
  description?: string;
  quote?: string;
  quoteAuthor?: string;
  image?: string;
}
