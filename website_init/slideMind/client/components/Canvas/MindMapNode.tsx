'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MindMapNode as MindMapNodeType } from '@/lib/canvas-store'

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
  const [editText, setEditText] = useState(node.text)
  const nodeRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return
    e.stopPropagation()

    onSelect(e)
    // Delegate drag start to parent
    onDragStart(e)
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
      onMouseUp={onMouseUp}
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
        <div className="mindmap-node-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{node.text}</ReactMarkdown>
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
