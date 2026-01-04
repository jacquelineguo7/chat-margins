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

  // TEMPORARY STATE: Control panel for typing feel experimentation
  const [showControls, setShowControls] = useState(true)
  const [caretColor, setCaretColor] = useState('#d06d16')
  const [caretWidth, setCaretWidth] = useState(1) // 1-5px
  const [blinkSpeed, setBlinkSpeed] = useState(1000) // milliseconds
  const [letterFadeIn, setLetterFadeIn] = useState(0) // 0-500ms
  const [letterScale, setLetterScale] = useState(0) // 0-0.2 (scaling effect)

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

  // REF: Track if we just pressed Enter (for detecting double Enter)
  const lastKeyWasEnter = useRef(false)

  // FUNCTION: Handle when user types in the editor
  const handleContentChange = (e) => {
    setContent(e.target.value)
  }

  // FUNCTION: Detect when user presses Enter twice
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      // If the last key was also Enter, we have a double Enter!
      if (lastKeyWasEnter.current) {
        // Get the current paragraphs (before the new one is created)
        const currentParagraphs = content.split('\n\n').filter(p => p.trim() !== '')
        const lastParagraphIndex = currentParagraphs.length - 1

        // Generate note for the paragraph we just finished
        if (lastParagraphIndex >= 0 && currentParagraphs[lastParagraphIndex]) {
          // Use setTimeout to ensure we don't generate twice
          setTimeout(() => {
            generateMarginNoteForParagraph(lastParagraphIndex, currentParagraphs[lastParagraphIndex])
          }, 100)
        }

        lastKeyWasEnter.current = false
      } else {
        lastKeyWasEnter.current = true
      }
    } else {
      lastKeyWasEnter.current = false
    }
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
      {/* TEMPORARY CONTROLS: Design tool for typography experimentation */}
      {showControls && (
        <div className="typing-controls">
          <div className="controls-header">
            <h3>Typing Feel Controls (Temporary)</h3>
            <button onClick={() => setShowControls(false)}>Hide</button>
          </div>

          <div className="control-group">
            <label>
              Caret Color:
              <input
                type="color"
                value={caretColor}
                onChange={(e) => setCaretColor(e.target.value)}
              />
              <span>{caretColor}</span>
            </label>
          </div>

          <div className="control-group">
            <label>
              Caret Width: {caretWidth}px
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={caretWidth}
                onChange={(e) => setCaretWidth(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="control-group">
            <label>
              Blink Speed: {blinkSpeed}ms
              <input
                type="range"
                min="300"
                max="2000"
                step="100"
                value={blinkSpeed}
                onChange={(e) => setBlinkSpeed(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="control-group">
            <label>
              Letter Fade-in: {letterFadeIn}ms
              <input
                type="range"
                min="0"
                max="500"
                step="50"
                value={letterFadeIn}
                onChange={(e) => setLetterFadeIn(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="control-group">
            <label>
              Letter Scale Effect: {letterScale.toFixed(2)}
              <input
                type="range"
                min="0"
                max="0.2"
                step="0.02"
                value={letterScale}
                onChange={(e) => setLetterScale(Number(e.target.value))}
              />
            </label>
          </div>
        </div>
      )}

      {/* Toggle button when controls are hidden */}
      {!showControls && (
        <button
          className="show-controls-btn"
          onClick={() => setShowControls(true)}
        >
          Show Typing Controls
        </button>
      )}

      {/* DOCUMENT CARD: Contains both editor and margins */}
      <div className="document-card">
        {/* LEFT COLUMN: Writing editor */}
        <div className="editor-column">
          <textarea
            ref={editorRef}
            className="editor"
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder="Start writing... Press Enter twice to create a new paragraph."
            style={{
              caretColor: caretColor,
              // Note: caret-width is not widely supported yet, but we'll add the CSS variable
              '--caret-width': `${caretWidth}px`,
              '--blink-speed': `${blinkSpeed}ms`,
              transition: letterFadeIn > 0 ? `opacity ${letterFadeIn}ms ease-in` : 'none'
            }}
          />
        </div>

        {/* RIGHT COLUMN: Margin notes */}
        <div className="margins-column">
          {paragraphs.length === 0 ? (
            <>
              <div className="margin-prompt">
                <span className="margin-prompt-icon">⏎</span>
                <span>press enter twice to reflect</span>
              </div>
              <p className="empty-state">Reflections will appear here as you write.</p>
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
