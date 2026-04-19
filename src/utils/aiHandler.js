import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * AI Handler with exponential backoff and model fallback.
 * Designed to handle 503 (Service Unavailable) and 429 (Rate Limit) errors
 * from the Google Generative AI API.
 */

const FALLBACK_MODELS = [
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b"
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Sends a message with automatic retry and model fallback logic.
 * 
 * @param {Object} options
 * @param {string} options.apiKey - Gemini API Key
 * @param {string} options.userMsg - The message to send
 * @param {Array} options.history - Chat history (standard format)
 * @param {string} options.systemInstruction - The system instruction/prompt
 * @param {string} options.modelName - Preferred model name (e.g. "gemini-3-flash-preview")
 * @param {number} options.maxRetries - Max retries per model
 * @param {number} options.initialDelay - Initial delay for exponential backoff (ms)
 * @returns {Promise<string>} - The response text
 */
export const sendMessageWithFallback = async ({
  apiKey,
  userMsg,
  history = [],
  systemInstruction,
  modelName = "gemini-1.5-flash",
  maxRetries = 3,
  initialDelay = 1000
}) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Build a unique list of models to try, starting with the requested model
  const modelsToTry = [...new Set([modelName, ...FALLBACK_MODELS])];
  
  let lastError = null;

  for (const currentModel of modelsToTry) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`[AI Handler] Using model: ${currentModel} (Attempt ${attempt + 1}/${maxRetries})`);
        
        const model = genAI.getGenerativeModel({ 
          model: currentModel,
          systemInstruction: systemInstruction
        });

        // The first message in history MUST be from the 'user' for Gemini SDK
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
        
        // 503: High Demand / Service Unavailable
        // 429: Rate Limit
        const isRetryable = errorMsg.includes("503") || errorMsg.includes("429");
        
        if (isRetryable && attempt < maxRetries - 1) {
          const waitTime = initialDelay * Math.pow(2, attempt);
          console.warn(`[AI Handler] Model ${currentModel} error (isRetryable: ${isRetryable}): ${errorMsg}. Retrying in ${waitTime}ms...`);
          await delay(waitTime);
          continue;
        }

        console.warn(`[AI Handler] Model ${currentModel} failed or exhausted retries. Error: ${errorMsg}`);
        break; // Break the attempt loop, try next model in fallback list
      }
    }
  }

  throw lastError || new Error("All AI models failed to respond.");
};
