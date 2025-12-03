import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI | null = null;

if (process.env.API_KEY) {
  genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const generateCommentary = async (
  event: string,
  batterName: string,
  bowlerName: string,
  score: string
): Promise<string> => {
  if (!genAI) return "Great shot!";

  try {
    const model = "gemini-2.5-flash";
    const prompt = `
      You are a cricket commentator. 
      The event is: ${event}. 
      Batter: ${batterName}. 
      Bowler: ${bowlerName}. 
      Current Score: ${score}.
      Write a VERY short, exciting, one-sentence commentary line (max 15 words) suitable for a live ticker. 
      Use emojis.
    `;

    const response = await genAI.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Gemini commentary failed", error);
    return "What a play! 🏏";
  }
};
