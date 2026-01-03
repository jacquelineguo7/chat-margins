// GEMINI API HELPER
// This file handles all communication with Google's Gemini AI

import { GoogleGenerativeAI } from '@google/generative-ai'

// INITIALIZE: Create the Gemini client
// The API key comes from your .env file
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

// MODEL: Use Gemini 1.5 Flash (fast and cost-effective)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

/**
 * FUNCTION: Generate a margin note for a paragraph
 *
 * This function sends the paragraph to Gemini and asks it to either:
 * 1. Provide thoughtful commentary (type: "commentary")
 * 2. Ask a reflective question (type: "question")
 *
 * @param {string} paragraphText - The paragraph the user wrote
 * @returns {Promise<{text: string, type: 'commentary' | 'question'}>}
 */
export async function generateMarginNote(paragraphText) {
  try {
    // PROMPT: Instructions for the AI
    // We ask it to respond in a specific format so we can parse it
    const prompt = `You are a thoughtful writing companion. The user is journaling and you're providing reflections in the margins.

For this paragraph:
"${paragraphText}"

Provide either:
1. A brief, empathetic commentary (1-2 sentences acknowledging what they wrote)
2. A gentle, reflective question to help them think deeper

Format your response EXACTLY like this:
TYPE: commentary
TEXT: Your response here

OR

TYPE: question
TEXT: Your question here

Keep your response under 50 words. Be warm, supportive, and genuinely curious.`

    // SEND REQUEST: Call Gemini API
    const result = await model.generateContent(prompt)
    const response = await result.response
    const responseText = response.text()

    // PARSE RESPONSE: Extract type and text from AI's response
    const typeMatch = responseText.match(/TYPE:\s*(commentary|question)/i)
    const textMatch = responseText.match(/TEXT:\s*(.+)/s)

    if (!typeMatch || !textMatch) {
      // If AI didn't follow format, default to commentary
      console.warn('AI response not in expected format:', responseText)
      return {
        type: 'commentary',
        text: responseText.trim()
      }
    }

    return {
      type: typeMatch[1].toLowerCase(),
      text: textMatch[1].trim()
    }
  } catch (error) {
    console.error('Error generating margin note:', error)

    // FALLBACK: If API fails, return a gentle error message
    return {
      type: 'commentary',
      text: "I'm having trouble connecting right now. Try again in a moment."
    }
  }
}
