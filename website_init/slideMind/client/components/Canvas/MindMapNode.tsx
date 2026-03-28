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
  onUpdateColor: (color: string | undefined) => void
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
  onUpdateColor,
  onPositionChange,
  onMouseUp,
  onDragStart,
}: Props) {
  const { isDragToolActive, setSelectedTerm } = useCanvasStore()

  const [editText, setEditText] = useState(node.text)
  const nodeRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  // Track text selection and store in global state
  useEffect(() => {
    const handleMouseUp = () => {
      if (isEditing || isDragToolActive) return

      const selection = window.getSelection()
      const text = selection?.toString().trim()

      if (text && text.length > 0) {
        const range = selection?.getRangeAt(0)
        if (range && contentRef.current?.contains(range.commonAncestorContainer)) {
          setSelectedTerm(text, node.id)
        }
      } else {
        setSelectedTerm(null, null)
      }
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [isEditing, isDragToolActive, setSelectedTerm, node.id])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return
    e.stopPropagation()
    // Only select and allow drag if drag tool is active
    if (isDragToolActive) {
      onSelect(e)
      onDragStart(e)
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragToolActive) {
      onMouseUp?.()
      return
    }
    // Check if text was selected
    const selection = window.getSelection()
    const text = selection?.toString().trim()
    if (!text || text.length === 0) {
      onSelect(e)
      onMouseUp?.()
    }
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
        '--node-color': node.color || '#000000',
      } as React.CSSProperties}
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
          <div className="mindmap-node-color-picker">
            <input
              type="color"
              value={node.color || '#000000'}
              onChange={(e) => onUpdateColor(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              title="选择边框颜色"
            />
            {node.color && (
              <button
                className="mindmap-node-btn color-clear"
                onClick={(e) => {
                  e.stopPropagation()
                  onUpdateColor(undefined)
                }}
                title="清除颜色"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="mindmap-node-color-presets">
            <button
              className="mindmap-node-btn color-preset"
              style={{ backgroundColor: '#EF4444' }}
              onClick={(e) => { e.stopPropagation(); onUpdateColor('#EF4444') }}
              title="红色"
            />
            <button
              className="mindmap-node-btn color-preset"
              style={{ backgroundColor: '#F97316' }}
              onClick={(e) => { e.stopPropagation(); onUpdateColor('#F97316') }}
              title="橙色"
            />
            <button
              className="mindmap-node-btn color-preset"
              style={{ backgroundColor: '#EAB308' }}
              onClick={(e) => { e.stopPropagation(); onUpdateColor('#EAB308') }}
              title="黄色"
            />
            <button
              className="mindmap-node-btn color-preset"
              style={{ backgroundColor: '#22C55E' }}
              onClick={(e) => { e.stopPropagation(); onUpdateColor('#22C55E') }}
              title="绿色"
            />
            <button
              className="mindmap-node-btn color-preset"
              style={{ backgroundColor: '#3B82F6' }}
              onClick={(e) => { e.stopPropagation(); onUpdateColor('#3B82F6') }}
              title="蓝色"
            />
            <button
              className="mindmap-node-btn color-preset"
              style={{ backgroundColor: '#8B5CF6' }}
              onClick={(e) => { e.stopPropagation(); onUpdateColor('#8B5CF6') }}
              title="紫色"
            />
            <button
              className="mindmap-node-btn color-preset"
              style={{ backgroundColor: '#EC4899' }}
              onClick={(e) => { e.stopPropagation(); onUpdateColor('#EC4899') }}
              title="粉色"
            />
          </div>
        </div>
      )}
    </div>
  )
}