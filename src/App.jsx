import { useState, useEffect } from 'react'
import './App.css'
import { generateMarginNote } from './gemini'

function App() {
  // STATE: This is where we store the user's writing content
  // useState creates a variable that React watches for changes
  const [content, setContent] = useState('')

  // STATE: Store margin notes - each note is tied to a paragraph
  // Structure: {
  //   paragraphIndex: {
  //     text: "AI response",
  //     type: "commentary" | "question",
  //     isVisible: true,
  //     isLoading: false  // true while AI is generating
  //   }
  // }
  const [marginNotes, setMarginNotes] = useState({})

  // EFFECT: Load saved content from localStorage when app starts
  // This runs once when the component first appears
  useEffect(() => {
    const savedContent = localStorage.getItem('chatMargins-content')
    const savedNotes = localStorage.getItem('chatMargins-notes')

    if (savedContent) {
      setContent(savedContent)
    }
    if (savedNotes) {
      setMarginNotes(JSON.parse(savedNotes))
    }
  }, []) // Empty array means "run once on mount"

  // EFFECT: Save content to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('chatMargins-content', content)
  }, [content]) // Runs whenever 'content' changes

  // EFFECT: Save margin notes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chatMargins-notes', JSON.stringify(marginNotes))
  }, [marginNotes]) // Runs whenever 'marginNotes' changes

  // FUNCTION: Split content into paragraphs
  // We use double newlines as paragraph separators
  const paragraphs = content.split('\n\n').filter(p => p.trim() !== '')

  // EFFECT: Auto-generate margin notes when new paragraphs are created
  useEffect(() => {
    // For each paragraph, generate a note if it doesn't have one
    paragraphs.forEach((paragraph, index) => {
      generateMarginNoteForParagraph(index, paragraph)
    })
  }, [paragraphs.length]) // Only run when number of paragraphs changes

  // FUNCTION: Handle when user types in the editor
  const handleContentChange = (e) => {
    setContent(e.target.value)
  }

  // FUNCTION: Generate AI margin note for a paragraph
  const generateMarginNoteForParagraph = async (paragraphIndex, paragraphText) => {
    // Skip if paragraph is too short (less than 10 characters)
    if (paragraphText.trim().length < 10) return

    // Skip if we already have a note for this paragraph
    if (marginNotes[paragraphIndex]) return

    try {
      // Show loading state
      setMarginNotes(prev => ({
        ...prev,
        [paragraphIndex]: {
          text: 'Thinking...',
          type: 'commentary',
          isVisible: true,
          isLoading: true
        }
      }))

      // Call Gemini API to generate the note
      const note = await generateMarginNote(paragraphText)

      // Update with actual note
      setMarginNotes(prev => ({
        ...prev,
        [paragraphIndex]: {
          text: note.text,
          type: note.type,
          isVisible: true,
          isLoading: false
        }
      }))
    } catch (error) {
      console.error('Failed to generate margin note:', error)
      // Remove loading state on error
      setMarginNotes(prev => {
        const newNotes = { ...prev }
        delete newNotes[paragraphIndex]
        return newNotes
      })
    }
  }

  // TEMPORARY: Test function to add sample notes
  const addTestNotes = () => {
    setMarginNotes({
      0: {
        text: "This opening feels vulnerable and honest. You're acknowledging both the stress and the struggle with self-doubt.",
        type: "commentary",
        isVisible: true
      },
      1: {
        text: "Given how much time you spent, what is the single most confusing concept from that half-hour that you can ask your professor about first?",
        type: "question",
        isVisible: true
      }
    })
  }

  return (
    <div className="app-container">
      {/* DOCUMENT CARD: Contains both editor and margins */}
      <div className="document-card">
        {/* LEFT COLUMN: Writing editor */}
        <div className="editor-column">
          {/* TEMPORARY: Test button */}
          <button
            onClick={addTestNotes}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              padding: '8px 12px',
              fontSize: '11px',
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            Add Test Notes
          </button>
          <textarea
            className="editor"
            value={content}
            onChange={handleContentChange}
            placeholder="Start writing... Press Enter twice to create a new paragraph."
          />
        </div>

        {/* RIGHT COLUMN: Margin notes */}
        <div className="margins-column">
          {paragraphs.length === 0 ? (
            <>
              <div className="margin-prompt">
                <span className="margin-prompt-icon">⏎</span>
                <span>enter to reflect</span>
              </div>
              <p className="empty-state">Your AI reflections will appear here as you write.</p>
            </>
          ) : (
            <div className="margin-notes-list">
              {paragraphs.map((paragraph, index) => {
                // Only render if we have a note for this paragraph
                const note = marginNotes[index]
                if (!note || !note.isVisible) return null

                // Determine if this is a question-style note (gets post-it styling)
                const isQuestion = note.type === 'question'
                const containerClass = isQuestion
                  ? 'margin-note-container is-question'
                  : 'margin-note-container'

                return (
                  <div key={index} className={containerClass}>
                    <div className="paragraph-preview">
                      Para {index + 1}
                    </div>
                    <div className="margin-note">
                      <p>{note.text}</p>
                    </div>
                    {/* Only show "NEW QUESTION" button for question-type notes */}
                    {isQuestion && (
                      <button className="new-question-btn">
                        ↻ NEW QUESTION
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
