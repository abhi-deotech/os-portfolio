/**
 * Puter AI Handler
 * Utilizes Puter.js to provide keyless AI chat capabilities.
 */

export const sendPuterAiMessage = async ({
  userMsg,
  history = [],
  systemInstruction,
  model = "gpt-4o" // Default model, Puter supports many
}) => {
  if (typeof window === 'undefined' || !window.puter) {
    throw new Error("Puter SDK not loaded");
  }

  try {
    // Format history for Puter AI if necessary. 
    // Puter's puter.ai.chat() often takes a simple prompt or messages array.
    // According to Puter docs, it's very flexible.
    
    const messages = [
      { role: "system", content: systemInstruction },
      ...history.map(m => ({
        role: m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user',
        content: m.text || m.content
      })),
      { role: "user", content: userMsg }
    ];

    // Use Puter AI Chat
    const response = await window.puter.ai.chat(messages, { model });
    
    // Puter returns a ChatResponse object
    return response.toString();
  } catch (error) {
    console.error("Puter AI Error:", error);
    throw error;
  }
};
