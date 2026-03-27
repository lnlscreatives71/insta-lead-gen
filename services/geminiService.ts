// Gemini AI Service - Synced
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { InstagramLead, Competitor } from "../types";

// --- EXPONENTIAL BACKOFF HELPER ---
export const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 4, baseDelayMs = 5000): Promise<T> => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error: any) {
      const errorMessage = error?.message?.toLowerCase() || String(error).toLowerCase();
      const isRateLimit = error?.status === 429 || errorMessage.includes('429') || errorMessage.includes('too many requests') || errorMessage.includes('quota') || errorMessage.includes('exhausted');
      
      if (isRateLimit && attempt < maxRetries - 1) {
        attempt++;
        const waitTime = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(`[429 Rate Limit Detected] Pausing engine for ${waitTime/1000}s before retrying... (Attempt ${attempt} of ${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error; 
      }
    }
  }
  throw new Error("Max API retries exceeded");
};

export const generateOutreachMessage = async (lead: InstagramLead): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Draft a personalized, professional, and high-converting DM/Email for the following micro-influencer.
    The goal is to offer a "Shared Success Studios" partnership where we help them monetize their audience.
    
    Influencer Details:
    - Handle: ${lead.handle}
    - Niche: ${lead.niche}
    - Followers: ${lead.followers.toLocaleString()}
    - Bio: "${lead.bio}"
    - Current Strength: ${lead.topFormat}
    - Projected Revenue Gap: $${lead.estRevenueGap.toLocaleString()}
    - Proposed Product Idea: ${lead.suggestedProduct?.name || 'A tailored digital product'}

    Tone: Collaborative, expert, but not spammy. Focus on the fact that they have amazing engagement but are leaving money on the table.
    
    Structure:
    1. Genuine compliment about their content.
    2. Data-backed observation (e.g. "Your ${lead.topFormat} are crushing it").
    3. Mention the specific idea: "${lead.suggestedProduct?.name}".
    4. Call to Action (Low pressure chat).
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    }));
    return response.text || "Failed to generate message.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating AI outreach. Please try again later.";
  }
};

// --- BATCH OPTIMIZATION: Process all leads in 1 API Call to avoid 429s ---
export const batchAnalyzeLeads = async (leads: Partial<InstagramLead>[]): Promise<{
  [username: string]: {
    strategy: {name: string, type: string, description: string},
    competitors: Competitor[]
  }
}> => {
  if (!process.env.API_KEY) throw new Error("GEMINI_KEY_MISSING");
  if (leads.length === 0) return {};
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const leadDataString = leads.map(l => 
    `Username: @${l.username} | Niche: ${l.niche} | Bio: ${l.bio} | Format: ${l.topFormat}`
  ).join('\n---\n');

  const prompt = `Analyze the following list of Instagram influencers. For EVERY influencer, provide a monetization strategy AND 2-3 real competitors.
  
  Influencers to analyze:
  ${leadDataString}
  
  Task 1: Suggest ONE specific digital product they could sell to their audience.
  Task 2: Find 2 to 3 real Instagram creators in their niche who are ALREADY successfully monetizing.
  
  Return a JSON array of objects. Each object must have the influencer's 'username', their 'strategy', and an array of 'competitors'.`;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              username: { type: Type.STRING },
              strategy: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["name", "type", "description"]
              },
              competitors: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    username: { type: Type.STRING },
                    monetizationMethod: { type: Type.STRING }
                  },
                  required: ["username", "monetizationMethod"]
                }
              }
            },
            required: ["username", "strategy", "competitors"]
          }
        }
      }
    }));

    const text = response.text;
    if (!text) throw new Error("AI_NO_RESPONSE");
    
    const parsedArray = JSON.parse(text.trim());
    
    // Map array to a dictionary for easy lookup by username
    const resultMap: Record<string, any> = {};
    for (const item of parsedArray) {
      // Clean username from the response just in case the AI included the @ symbol
      const cleanUsername = item.username.replace('@', '');
      resultMap[cleanUsername] = {
        strategy: item.strategy,
        competitors: item.competitors
      };
    }
    
    return resultMap;
  } catch (error) {
    console.error("Batch Gen Error:", error);
    // If it fails, return an empty map so the app doesn't crash, it just won't have strategies
    return {};
  }
};