import { GoogleGenAI, Type } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found in environment");
  return new GoogleGenAI({ apiKey });
};

export const analyzeImageForTags = async (base64Image: string): Promise<{ title: string, tags: string[], description: string }> => {
  const ai = getClient();
  
  // Clean base64 string if it contains data URI header
  const data = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image', // Optimized for vision tasks
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg', // Assuming jpeg for simplicity, in prod detect from file
            data: data
          }
        },
        {
          text: "Analyze this image. Provide a concise title, a list of 5-8 relevant searchable tags, and a short visual description. Return as JSON."
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          description: { type: Type.STRING }
        }
      }
    }
  });

  if (response.text) {
    return JSON.parse(response.text);
  }
  
  throw new Error("Failed to analyze image");
};

export const suggestConnections = async (entityTitle: string, entityContent: string, allTitles: string[]): Promise<string[]> => {
    const ai = getClient();
    
    const prompt = `
      I have a creative asset titled "${entityTitle}" with content/description: "${entityContent}".
      I have a database of other assets with these titles: ${JSON.stringify(allTitles)}.
      Which of the existing assets might be conceptually related to this new one? 
      Return a JSON object with a list of "relatedTitles". Only select highly relevant matches based on semantic similarity (e.g. same character, same setting, same style).
    `;
  
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
         responseSchema: {
          type: Type.OBJECT,
          properties: {
            relatedTitles: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
  
    if (response.text) {
      const result = JSON.parse(response.text);
      return result.relatedTitles || [];
    }
    return [];
  };
