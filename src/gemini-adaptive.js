// Adaptive prompting system for Gemini
// This version lets Gemini analyze the content type and choose its own prompt style

import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini API (same as original gemini.js)
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

/**
 * ADAPTIVE MARGIN NOTE GENERATOR
 *
 * How this works differently from the original:
 * 1. First, we ask Gemini to analyze what TYPE of content the user wrote
 * 2. Then, we ask Gemini to respond appropriately based on that type
 *
 * This allows Gemini to self-select the best response style:
 * - Journaling → empathetic reflection
 * - Brainstorming → idea expansion
 * - Technical → clarifying questions
 * - Storytelling → narrative feedback
 * etc.
 */

export async function generateMarginNote(paragraphText) {
  try {
    // STAGE 1: Ask Gemini to analyze the content type
    // This is the "self-prompting" part - Gemini decides what kind of content this is
    const analysisPrompt = `Analyze this text and identify what type of writing it is.

Text: "${paragraphText}"

Categorize it as ONE of these types:
- journaling (personal reflection, emotions, daily thoughts)
- brainstorming (ideas, plans, creative thinking)
- technical (code, analysis, problem-solving)
- storytelling (narrative, fiction, describing events)
- note-taking (facts, lists, information capture)
- other (anything else)

Respond with ONLY the category name, nothing else.`

    const analysisResult = await model.generateContent(analysisPrompt)
    const analysisResponse = await analysisResult.response
    const contentType = analysisResponse.text().trim().toLowerCase()

    // STAGE 2: Generate the actual margin note based on the detected type
    // Different prompt for each content type
    let mainPrompt = ''

    switch (contentType) {
      case 'journaling':
        // Use the original journaling-style prompt
        mainPrompt = `You are a thoughtful writing companion. The user is journaling.

For this paragraph:
"${paragraphText}"

Provide either:
1. A brief, empathetic commentary (1-2 sentences)
2. A gentle, reflective question

Format your response EXACTLY like this:
TYPE: commentary
TEXT: Your response here

OR

TYPE: question
TEXT: Your question here

Keep it under 50 words. Be warm and curious.`
        break

      case 'brainstorming':
        // For brainstorming, help expand ideas
        mainPrompt = `You are a creative thinking partner. The user is brainstorming ideas.

For this paragraph:
"${paragraphText}"

Provide either:
1. A brief connection to related ideas or possibilities
2. A question that expands the thinking

Format your response EXACTLY like this:
TYPE: commentary
TEXT: Your response here

OR

TYPE: question
TEXT: Your question here

Keep it under 50 words. Be energizing and idea-generating.`
        break

      case 'technical':
        // For technical writing, ask clarifying questions
        mainPrompt = `You are a technical review assistant. The user is writing technical content.

For this paragraph:
"${paragraphText}"

Provide either:
1. A brief technical observation or connection
2. A clarifying question about implementation or edge cases

Format your response EXACTLY like this:
TYPE: commentary
TEXT: Your response here

OR

TYPE: question
TEXT: Your question here

Keep it under 50 words. Be precise and technically insightful.`
        break

      case 'storytelling':
        // For storytelling, provide narrative feedback
        mainPrompt = `You are a story development assistant. The user is writing a narrative.

For this paragraph:
"${paragraphText}"

Provide either:
1. A brief observation about character, setting, or plot
2. A question about what happens next or character motivation

Format your response EXACTLY like this:
TYPE: commentary
TEXT: Your response here

OR

TYPE: question
TEXT: Your question here

Keep it under 50 words. Be encouraging and narrative-focused.`
        break

      case 'note-taking':
        // For notes, help organize and connect information
        mainPrompt = `You are a note organization assistant. The user is capturing information.

For this paragraph:
"${paragraphText}"

Provide either:
1. A brief connection to related concepts or categories
2. A question about missing information or next steps

Format your response EXACTLY like this:
TYPE: commentary
TEXT: Your response here

OR

TYPE: question
TEXT: Your question here

Keep it under 50 words. Be organized and connective.`
        break

      default:
        // Fallback: use general supportive prompting
        mainPrompt = `You are a supportive writing assistant.

For this paragraph:
"${paragraphText}"

Provide either:
1. A brief, helpful commentary
2. A thoughtful question

Format your response EXACTLY like this:
TYPE: commentary
TEXT: Your response here

OR

TYPE: question
TEXT: Your question here

Keep it under 50 words. Be helpful and clear.`
        break
    }

    // Generate the actual margin note using the type-specific prompt
    const result = await model.generateContent(mainPrompt)
    const response = await result.response
    const responseText = response.text()

    // Parse the response (same parsing logic as original)
    const typeMatch = responseText.match(/TYPE:\s*(commentary|question)/i)
    const textMatch = responseText.match(/TEXT:\s*(.+)/s)

    // If the format is wrong, fallback to treating it as commentary
    if (!typeMatch || !textMatch) {
      return {
        type: 'commentary',
        text: responseText.trim()
      }
    }

    // Return the parsed response
    return {
      type: typeMatch[1].toLowerCase(),
      text: textMatch[1].trim()
    }

  } catch (error) {
    // Error handling - same as original
    console.error('Error generating adaptive margin note:', error)
    return {
      type: 'commentary',
      text: 'Unable to generate reflection. Please try again.'
    }
  }
}
