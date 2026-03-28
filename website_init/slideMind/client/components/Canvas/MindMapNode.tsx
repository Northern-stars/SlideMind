'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MindMapNode as MindMapNodeType, useCanvasStore } from '@/lib/canvas-store'

interface Props {
  node: MindMapNodeType
  isSelected: boolean
  isEditing: boolean
  isDragging: boolean
  dragOffset: { x: number; y: number }
  onSelect: (e: React.MouseEvent) => void
  onStartEdit: () => void
  onEndEdit: () => void
  onUpdateText: (text: string) => void
  onPositionChange: (position: { x: number; y: number }) => void
  onMouseUp?: () => void
  onDragStart: (e: React.MouseEvent) => void
}

export default function MindMapNode({
  node,
  isSelected,
  isEditing,
  isDragging: externalIsDragging,
  dragOffset: externalDragOffset,
  onSelect,
  onStartEdit,
  onEndEdit,
  onUpdateText,
  onPositionChange,
  onMouseUp,
  onDragStart,
}: Props) {
  const { isDragToolActive, addMindMapNode, addMindMapEdge, mindMapData } = useCanvasStore()

  const [editText, setEditText] = useState(node.text)
  const [selectedText, setSelectedText] = useState('')
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false)
  const nodeRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  // Detect text selection
  useEffect(() => {
    const handleMouseUp = () => {
      if (isEditing || isDragToolActive) return

      const selection = window.getSelection()
      const text = selection?.toString().trim()

      if (text && text.length > 0) {
        // Check if selection is within this node
        const range = selection?.getRangeAt(0)
        if (range && contentRef.current?.contains(range.commonAncestorContainer)) {
          const rect = range.getBoundingClientRect()
          const nodeRect = nodeRef.current?.getBoundingClientRect()
          if (nodeRect) {
            setSelectedText(text)
            setTooltipPos({
              x: rect.left - nodeRect.left + rect.width / 2,
              y: rect.top - nodeRect.top - 10,
            })
            setShowTooltip(true)
          }
        }
      } else {
        setShowTooltip(false)
      }
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [isEditing, isDragToolActive])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return
    e.stopPropagation()
    setShowTooltip(false)
    // Only select and allow drag if drag tool is active
    if (isDragToolActive) {
      onSelect(e)
      onDragStart(e)
    }
    // When drag tool is not active, let text selection happen naturally
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragToolActive) {
      onMouseUp?.()
      return
    }
    // When drag tool is not active, check if text was selected
    const selection = window.getSelection()
    const text = selection?.toString().trim()
    if (!text || text.length === 0) {
      onSelect(e)
      onMouseUp?.()
    }
    // If text was selected, don't trigger connection logic
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onStartEdit()
  }

  const handleBlur = () => {
    onUpdateText(editText)
    onEndEdit()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditText(node.text)
      onEndEdit()
    } else if (e.key === 'Enter' && e.ctrlKey) {
      onUpdateText(editText)
      onEndEdit()
    }
  }

  const handleExplain = async () => {
    if (!selectedText || !mindMapData) return
    setIsLoadingExplanation(true)
    setShowTooltip(false)

    try {
      const res = await fetch('http://localhost:3001/api/chat/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: selectedText }),
      })
      const data = await res.json()
      if (data.explanation) {
        // Create new node with explanation
        const newNodeId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        const newNode: MindMapNodeType = {
          id: newNodeId,
          text: `**${selectedText}**\n\n${data.explanation}`,
          position: {
            x: node.position.x + 220,
            y: node.position.y + Math.random() * 100 - 50,
          },
        }
        addMindMapNode(newNode)

        // Add edge from current node to new node
        const edgeId = `edge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        addMindMapEdge({
          id: edgeId,
          from: node.id,
          to: newNodeId,
        })

        // Add to chat context
        await fetch('http://localhost:3001/api/chat/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'assistant',
            content: `用户选中了"${selectedText}"，以下是解释：\n\n${data.explanation}`,
          }),
        })
      }
    } catch (error) {
      console.error('Failed to explain term:', error)
    } finally {
      setIsLoadingExplanation(false)
    }
  }

  return (
    <div
      ref={nodeRef}
      className={`mindmap-node ${isSelected ? 'selected' : ''} ${externalIsDragging ? 'dragging' : ''}`}
      style={{
        left: node.position.x,
        top: node.position.y,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onMouseUp={handleMouseUp}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="mindmap-node-editor"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="mindmap-node-content" ref={contentRef}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{node.text}</ReactMarkdown>
        </div>
      )}

      {/* Selection tooltip - only show when drag tool is NOT active */}
      {showTooltip && !isEditing && !isDragToolActive && (
        <div
          className="mindmap-tooltip"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <button
            onClick={handleExplain}
            className="mindmap-tooltip-btn"
            disabled={isLoadingExplanation}
          >
            {isLoadingExplanation ? '解释中...' : '解释'}
          </button>
        </div>
      )}

      {isSelected && !isEditing && (
        <div className="mindmap-node-actions">
          <button
            className="mindmap-node-btn edit"
            onClick={(e) => {
              e.stopPropagation()
              onStartEdit()
            }}
            title="编辑"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
