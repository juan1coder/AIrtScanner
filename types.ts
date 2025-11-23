
export interface AnalysisResult {
  style: string;
  artist: string;
  techniques: string[];
  colorPalette: string[];
  composition: string[];
  mood: string;
  creativePrompt: string; // New field for the evocative description
}

export interface StyleExtractionResult {
  lighting: string[];
  medium: string[];
  textures: string[];
  techniques: string[];
  vibe: string[];
}

export type OutputFormat = 'txt' | 'json' | 'toml';

export interface GeneratedItem {
  id: string;
  imageUrl: string;
  title: string;
  prompt: string;
  modifiers: string[];
  styleContext?: string; // The full text analysis if available
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text?: string;
  imageUrl?: string;
  executedPrompt?: string; // The full prompt sent to the AI
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
