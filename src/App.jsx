import { useState, useEffect, useRef } from 'react'
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

  // STATE: Store Y positions for each paragraph
  const [paragraphPositions, setParagraphPositions] = useState({})

  // REF: Reference to the textarea element
  const editorRef = useRef(null)

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

  // STATE: Track previous paragraph count
  const prevParagraphCount = useRef(0)

  // EFFECT: Auto-generate margin notes when new paragraphs are created
  useEffect(() => {
    // Only generate notes when paragraph count increases (user pressed Enter Enter)
    if (paragraphs.length > prevParagraphCount.current) {
      // Generate note for the NEW paragraph (the one before the latest)
      // We target the second-to-last paragraph because the last one is likely still being typed
      const targetIndex = paragraphs.length - 2

      if (targetIndex >= 0 && paragraphs[targetIndex]) {
        generateMarginNoteForParagraph(targetIndex, paragraphs[targetIndex])
      }
    }

    prevParagraphCount.current = paragraphs.length
  }, [paragraphs.length]) // Only run when number of paragraphs changes

  // FUNCTION: Calculate Y position for each paragraph in the textarea
  const calculateParagraphPositions = () => {
    if (!editorRef.current) return

    const textarea = editorRef.current
    const style = window.getComputedStyle(textarea)
    const lineHeight = parseFloat(style.lineHeight)
    const paddingTop = parseFloat(style.paddingTop)
    const fontSize = parseFloat(style.fontSize)

    // Create a temporary div to measure text height accurately
    const measureDiv = document.createElement('div')
    measureDiv.style.position = 'absolute'
    measureDiv.style.visibility = 'hidden'
    measureDiv.style.width = `${textarea.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)}px`
    measureDiv.style.fontSize = style.fontSize
    measureDiv.style.fontFamily = style.fontFamily
    measureDiv.style.lineHeight = style.lineHeight
    measureDiv.style.whiteSpace = 'pre-wrap'
    measureDiv.style.wordWrap = 'break-word'
    document.body.appendChild(measureDiv)

    // Split content by double newlines to get paragraphs
    const paragraphTexts = content.split('\n\n')
    const positions = {}
    let currentY = paddingTop

    paragraphTexts.forEach((para, index) => {
      if (para.trim() === '') return

      // Store the Y position for this paragraph
      positions[index] = currentY

      // Measure the height of this paragraph
      measureDiv.textContent = para
      const paraHeight = measureDiv.offsetHeight

      // Move Y down by paragraph height plus spacing for double newline
      currentY += paraHeight + (lineHeight * 2)
    })

    // Clean up
    document.body.removeChild(measureDiv)

    setParagraphPositions(positions)
  }

  // EFFECT: Recalculate positions when content changes
  useEffect(() => {
    // Use setTimeout to ensure calculation happens after DOM updates
    const timer = setTimeout(() => {
      calculateParagraphPositions()
    }, 0)
    return () => clearTimeout(timer)
  }, [content])

  // EFFECT: Recalculate positions on window resize
  useEffect(() => {
    window.addEventListener('resize', calculateParagraphPositions)
    return () => window.removeEventListener('resize', calculateParagraphPositions)
  }, [content])

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


  return (
    <div className="app-container">
      {/* DOCUMENT CARD: Contains both editor and margins */}
      <div className="document-card">
        {/* LEFT COLUMN: Writing editor */}
        <div className="editor-column">
          <textarea
            ref={editorRef}
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

                // Get the Y position for this paragraph
                // Subtract the margins column padding (60px) to align properly
                const yPosition = (paragraphPositions[index] || 0) - 60

                // Use simple commentary style for all notes
                return (
                  <div
                    key={index}
                    className="margin-note-container"
                    style={{
                      position: 'absolute',
                      top: `${yPosition}px`,
                      width: 'calc(100% - 60px)' // Account for padding
                    }}
                  >
                    <div className="paragraph-preview">
                      Para {index + 1}
                    </div>
                    <div className="margin-note">
                      <p>{note.text}</p>
                    </div>
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
