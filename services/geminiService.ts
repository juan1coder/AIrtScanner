
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AnalysisResult, StyleExtractionResult } from '../types';

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

const getSystemInstruction = (intensity: number) => {
    let instruction = `You are an expert AI art curator and prompt engineer. Your task is to analyze the input image and "reverse engineer" a high-quality text prompt for it.

1.  **Analyze the Visuals:** Identify the art style, medium (oil, digital, photo, etc.), artist influence, color palette, and lighting.
2.  **Describe the Subject:** Describe the subject matter with artistic flair.
3.  **Synthesize (The Creative Prompt):** Combine the subject description and the style analysis into a single, flowing, evocative paragraph.`;

    // LEVEL 1: Enhanced Standard (Beefed Up)
    if (intensity === 1) {
        instruction += `\n\n**Level 1 (Deep Atmosphere):** Do not be robotic. Focus heavily on the *atmosphere* and *lighting techniques*. Use descriptive adjectives (e.g., "glinting", "diffused", "vibrant", "melancholic", "stark"). Describe the lighting in detail (e.g., "backlit", "softbox", "natural light").`;
    }
    // LEVEL 2: Creative Flourish
    else if (intensity === 2) {
        instruction += `\n\n**Level 2 (Creative Embellishment):** Embellish the description with creative flourishes. Describe movement, flow, and exaggerated forms that might not be strictly literal but capture the *feeling* (e.g., 'tendrils extending to the sky', 'hair shining like raven feathers', 'eyes glowing with ancient wisdom'). Make it dramatic, poetic, and interpretative.`;
    }
    // LEVEL 3: SOTA & Artist Inference
    else if (intensity >= 3) {
        instruction += `\n\n**Level 3 (SOTA & Artist Inference):** Take it to the extreme.
        - **Technical Specs:** You MUST invent plausible high-end technical details: Camera lenses (e.g., '85mm f/1.8', 'macro'), rendering engines (e.g., 'Octane Render', 'Unreal Engine 5'), and advanced lighting terms (e.g., 'subsurface scattering', 'chromatic aberration', 'volumetric fog', 'ray tracing').
        - **Artist Inference:** You **MUST** detect and explicitly name the specific artist style best suited for this subject based on the image inflection. (e.g., If biomechanical, use "in the style of HR Giger"; if surrealist, use "Salvador Dali"; if baroque light, use "Rembrandt"). 
        - **Hyper-Detail:** The prompt should be dense, sophisticated, and suitable for a top-tier generative AI model.`;
    }

    instruction += `\n\nOutput the result in JSON format containing both the structured metadata and this creative prompt.`;
    return instruction;
};

export async function analyzeImageStyle(base64ImageData: string, mimeType: string, intensity: number = 1): Promise<AnalysisResult> {
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
            systemInstruction: getSystemInstruction(intensity),
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
): Promise<{ imageUrl: string, executedPrompt: string }> {
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
        return {
            imageUrl: `data:image/png;base64,${base64ImageBytes}`,
            executedPrompt: fullPrompt
        };
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

// --- NEW FUNCTION: Style Extraction ---

const extractionSchema = {
    type: Type.OBJECT,
    properties: {
        lighting: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Lighting keywords (e.g., "volumetric", "chiaroscuro").' },
        medium: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Art medium (e.g., "oil on canvas", "digital 3D render").' },
        textures: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Surface qualities (e.g., "matte", "glossy", "grunge").' },
        techniques: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Rendering techniques (e.g., "impasto", "ray tracing").' },
        vibe: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Atmospheric or aesthetic descriptors (e.g., "uncanny valley", "ethereal").' }
    },
    required: ['lighting', 'medium', 'textures', 'techniques', 'vibe']
};

export async function extractStylesFromText(promptText: string): Promise<StyleExtractionResult> {
    const geminiClient = getAi();

    const extractionSystemInstruction = `
    You are a Style Distiller. Your job is to extract pure stylistic and technical keywords from a long, complex art prompt.
    
    CRITICAL RULES:
    1. **IGNORE SUBJECTS:** Do not extract words describing WHO or WHAT is in the image (e.g., ignore "woman", "cyborg", "cat", "city", "forest").
    2. **IGNORE COMPOSITION:** Do not extract words describing framing or angles (e.g., ignore "wide shot", "portrait").
    3. **EXTRACT ONLY:** 
       - Lighting (e.g., volumetric, rim light, subsurface scattering)
       - Medium (e.g., oil paint, unreal engine 5, polaroid)
       - Textures (e.g., grunge, chrome, fluffy)
       - Techniques/Styles (e.g., cyberpunk, impressionist, ray tracing, uncanny valley)
    4. **Goal:** Create a list of tags that could be applied to a DIFFERENT subject to give it the same "look and feel".
    `;

    const response = await geminiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Extract the style DNA from this prompt: "${promptText}"`,
        config: {
            systemInstruction: extractionSystemInstruction,
            responseMimeType: "application/json",
            responseSchema: extractionSchema,
        },
    });

    const jsonText = response.text.trim();
    try {
        return JSON.parse(jsonText) as StyleExtractionResult;
    } catch (e) {
        console.error("Failed to parse extraction JSON:", jsonText);
        return { lighting: [], medium: [], textures: [], techniques: [], vibe: [] };
    }
}
