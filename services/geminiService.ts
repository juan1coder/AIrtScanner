
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AnalysisResult } from '../types';

let ai: GoogleGenAI;

const getAi = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    style: { type: Type.STRING, description: 'The primary artistic style or movement (e.g., Impressionism, Surrealism).' },
    artist: { type: Type.STRING, description: 'The likely artist or a style descriptor (e.g., "in the style of Vincent van Gogh").' },
    techniques: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'A list of key artistic techniques used (e.g., "Impasto", "Bold Brushstrokes").'
    },
    colorPalette: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'A list of descriptive keywords for the color palette (e.g., "Vibrant Yellows", "Deep Blues").'
    },
    composition: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'A list of keywords describing the composition (e.g., "Dynamic lines", "Asymmetrical balance").'
    },
    mood: { type: Type.STRING, description: 'The overall mood or feeling conveyed by the style (e.g., "Emotional and Dynamic", "Calm and Serene").' },
    creativePrompt: { 
        type: Type.STRING, 
        description: 'A highly detailed, evocative, and artistic text prompt that describes the subject matter, style, lighting, and atmosphere combined. This prompt should be suitable for generating a similar image in an AI model.' 
    }
  },
  required: ['style', 'artist', 'techniques', 'colorPalette', 'composition', 'mood', 'creativePrompt']
};

const systemInstruction = `You are an expert AI art curator and prompt engineer. Your task is to analyze the input image and "reverse engineer" a high-quality text prompt for it.

1.  **Analyze the Visuals:** Identify the art style, medium (oil, digital, photo, etc.), artist influence, color palette, and lighting.
2.  **Describe the Subject:** Unlike a dry catalog entry, describe the subject matter with artistic flair. Don't just say "a woman"; say "a striking biomechanical woman adorned by chips and circuits".
3.  **Synthesize (The Creative Prompt):** Combine the subject description and the style analysis into a single, flowing, evocative paragraph. Use descriptive adjectives (e.g., "glinting", "diffused", "vibrant", "melancholic").
    *   *Example:* "A striking biomechanical woman exudes HR Giger artistry. She is a cyber-goddess adorned by intricate chips and circuits in a monochrome tone, only her eyes glint with a soft pink diffused glow. The composition uses stark chiaroscuro lighting to highlight the metallic textures."

Output the result in JSON format containing both the structured metadata and this creative prompt.`;

export async function analyzeImageStyle(base64ImageData: string, mimeType: string): Promise<AnalysisResult> {
    const geminiClient = getAi();
    
    const imagePart = {
      inlineData: {
        data: base64ImageData,
        mimeType: mimeType,
      },
    };
  
    const textPart = {
      text: "Analyze this image and generate a creative art prompt for it.",
    };
  
    const response = await geminiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        },
    });

    const jsonText = response.text.trim();
    try {
        const parsedResult = JSON.parse(jsonText);
        return parsedResult as AnalysisResult;
    } catch (e) {
        console.error("Failed to parse JSON response:", jsonText);
        throw new Error("Received an invalid format from the API.");
    }
}

export async function editImageWithGemini(
    base64ImageData: string, 
    mimeType: string, 
    prompt: string, 
    modifiers: string[]
): Promise<string> {
    const geminiClient = getAi();
    
    const modifierString = modifiers.length > 0 
        ? `Apply the following artistic styles and techniques: ${modifiers.join(', ')}.` 
        : '';
    
    const fullPrompt = `${prompt}. ${modifierString} Maintain the core composition of the source image but transform it based on the description.`;

    const imagePart = {
        inlineData: {
            data: base64ImageData,
            mimeType: mimeType,
        },
    };

    const textPart = {
        text: fullPrompt,
    };

    const response = await geminiClient.models.generateContent({
        model: 'gemini-2.5-flash-image', // Nano Banana / Flash Image
        contents: {
            parts: [imagePart, textPart]
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:image/png;base64,${base64ImageBytes}`;
    }
    
    throw new Error("No image generated.");
}

export async function generateCreativeTitle(prompt: string, modifiers: string[]): Promise<string> {
    const geminiClient = getAi();
    const input = `Prompt: ${prompt}, Styles: ${modifiers.join(', ')}`;
    
    const response = await geminiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Generate a short, punchy, creative title (maximum 5 words) for an artwork created with this description: "${input}". Return ONLY the title, no quotes.`,
    });
    
    return response.text?.trim() || "Untitled Masterpiece";
}
