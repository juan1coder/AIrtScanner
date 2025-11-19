
export interface AnalysisResult {
  style: string;
  artist: string;
  techniques: string[];
  colorPalette: string[];
  composition: string[];
  mood: string;
}

export type OutputFormat = 'txt' | 'json' | 'toml';

export interface GeneratedItem {
  id: string;
  imageUrl: string;
  title: string;
  prompt: string;
  modifiers: string[];
  timestamp: number;
}

export const STYLE_PRESETS = [
  "Cinematic", 
  "Niji Anime", 
  "Gouache Oil", 
  "Pop Art", 
  "Chiaroscuro", 
  "Cyberpunk",
  "Watercolor",
  "Vaporwave",
  "Noir",
  "Studio Ghibli"
];
