import { GoogleGenAI, Type } from "@google/genai";

export class GeminiService {
    ai: GoogleGenAI | null;

    constructor() {
        this.ai = process.env.API_KEY ? new GoogleGenAI({apiKey: process.env.API_KEY}) : null;
        if (!this.ai) {
            console.error("API_KEY is not configured. AI features will be disabled.");
        }
    }

    isAvailable() {
        return !!this.ai;
    }

    async generateCrop(idea: string) {
        if (!this.isAvailable()) return null;
        try {
            const cropSchema = {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: 'A creative, evocative name for the plant.' },
                    description: { type: Type.STRING, description: 'A short, flavorful description.' },
                    yields: { type: Type.STRING, description: 'The name of the item this plant produces when harvested.' },
                    alchemicalAspect: { type: Type.STRING, description: 'An alchemical property (e.g., Fiery, Soothing, Shadowy, Resilient).' },
                    growthTime: { type: Type.INTEGER, description: 'How many days this plant takes to grow (a number between 3 and 10).' },
                },
                required: ['name', 'description', 'yields', 'alchemicalAspect', 'growthTime']
            };

            const imagePrompt = `A detailed pixel art sprite of a fantasy plant inspired by '${idea}'. It should be on a transparent background, 256x256 pixels, centered, in a style similar to Stardew Valley.`;

            const [dataResponse, imageResponse] = await Promise.all([
                this.ai!.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Generate the properties for a fantasy plant based on this idea: "${idea}"`,
                    config: { responseMimeType: "application/json", responseSchema: cropSchema }
                }),
                this.ai!.models.generateImages({
                    // FIX: Updated deprecated image generation model to 'imagen-4.0-generate-001'.
                    model: 'imagen-4.0-generate-001',
                    prompt: imagePrompt,
                    config: { numberOfImages: 1, outputMimeType: 'image/png' }
                })
            ]);
            
            const cropData = JSON.parse(dataResponse.text);
            const imageUrl = `data:image/png;base64,${imageResponse.generatedImages[0].image.imageBytes}`;
            
            return { ...cropData, imageUrl };
        } catch (error) {
            console.error('Gemini API call failed:', error);
            return null;
        }
    }

    async generateHollowDescription(moonPhase: string) {
        if (!this.isAvailable()) return "The air grows cold. A sense of dread emanates from the swirling portal.";
        try {
            const response = await this.ai!.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `The current moon phase is '${moonPhase}'. Describe the entrance to a terrifying, otherworldly dungeon called 'The Hollow's Maw' in one or two short, evocative sentences, subtly influenced by the moon phase. The tone is dark fantasy.`,
            });
            return response.text;
        } catch (error) {
            console.error('Hollow description generation failed:', error);
            return "The air grows cold. The portal seems to breathe with a life of its own.";
        }
    }
     async askScarecrow(question: string) {
        if (!this.isAvailable()) return "The scarecrow remains silent, its button eyes staring blankly.";
        try {
            const response = await this.ai!.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: question,
                config: { systemInstruction: "You are Patches, a sentient, slightly cryptic scarecrow in a dark fantasy farming game. You answer questions with short, folksy, and ominous wisdom about the land, the crops, and the shadows. Your answers should be 1-3 sentences long." }
            });
            return response.text;
        } catch (error) {
            console.error('Scarecrow ask failed:', error);
            return "The wind rustles through the scarecrow's straw, but it offers no answer.";
        }
    }
}