import { useState, useEffect } from 'react'
import './App.css'

function App() {
  // STATE: This is where we store the user's writing content
  // useState creates a variable that React watches for changes
  const [content, setContent] = useState('')

  // STATE: Store margin notes - each note is tied to a paragraph
  // Structure: { paragraphIndex: { messages: [], isVisible: true } }
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

  // FUNCTION: Handle when user types in the editor
  const handleContentChange = (e) => {
    setContent(e.target.value)
  }

  // FUNCTION: Generate AI margin note for a paragraph
  const generateMarginNote = async (paragraphIndex, paragraphText) => {
    // TODO: We'll add Gemini API call here
    // For now, just create a placeholder
    console.log('Would generate note for paragraph:', paragraphIndex)
  }

  return (
    <div className="app-container">
      {/* DOCUMENT CARD: Contains both editor and margins */}
      <div className="document-card">
        {/* LEFT COLUMN: Writing editor */}
        <div className="editor-column">
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
              {paragraphs.map((paragraph, index) => (
                <div key={index} className="margin-note-container">
                  <div className="paragraph-preview">
                    {paragraph.substring(0, 40)}...
                  </div>
                  <div className="margin-note">
                    <p>AI note for paragraph {index + 1} will appear here</p>
                  </div>
                  <button className="new-question-btn">
                    ↻ NEW QUESTION
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
