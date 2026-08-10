import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * AI Handler with exponential backoff and model fallback.
 * Updated for June 2026 Model Support (Gemini 3.5+).
 */

const FALLBACK_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.0-flash"
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const sendMessageWithFallback = async ({
  apiKey,
  userMsg,
  history = [],
  systemInstruction,
  modelName = "gemini-3.5-flash",
  maxRetries = 2,
  initialDelay = 1000
}) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Build list of models to try
  const modelsToTry = [...new Set([modelName, ...FALLBACK_MODELS])];
  
  let lastError = null;

  for (const currentModel of modelsToTry) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`[AI Handler] Connecting to model: ${currentModel}`);
        
        const model = genAI.getGenerativeModel({ 
          model: currentModel,
          systemInstruction: systemInstruction
        });

        const firstUserIndex = history.findIndex(m => m.role === 'user');
        const formattedHistory = firstUserIndex !== -1 
          ? history.slice(firstUserIndex).map(m => ({
              role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
              parts: [{ text: m.text || m.parts?.[0]?.text }]
            }))
          : [];

        const chat = model.startChat({ history: formattedHistory });
        const result = await chat.sendMessage(userMsg);
        const response = await result.response;
        return response.text();

      } catch (error) {
        lastError = error;
        const errorMsg = error.message || "";
        
        // Instant fallback for deprecated models (404)
        if (errorMsg.includes("404") || errorMsg.includes("not found")) {
          console.warn(`[AI Handler] Model ${currentModel} is unavailable/deprecated. Falling back...`);
          break; 
        }

        // Retry on transient errors
        if ((errorMsg.includes("503") || errorMsg.includes("429")) && attempt < maxRetries - 1) {
          await delay(initialDelay * (attempt + 1));
          continue;
        }

        break; 
      }
    }
  }

  throw lastError || new Error("Neural link failed. Ensure your API key supports Gemini 3.5+.");
};
