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
  onResize?: (size: { width: number; height: number }) => void
}

type ResizeDirection = 'se' | 'sw' | 'ne' | 'nw' | 's' | 'n' | 'e' | 'w' | null

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
  onResize,
}: Props) {
  const { isDragToolActive, setSelectedTerm } = useCanvasStore()

  const [editText, setEditText] = useState(node.text)
  const [isResizing, setIsResizing] = useState(false)
  const isResizingRef = useRef(false)  // Use ref to track resize state immediately
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection>(null)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
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
    if (isDragToolActive || isResizingRef.current) {
      onMouseUp?.()
      return
    }
    // Check if text was selected
    const selection = window.getSelection()
    const text = selection?.toString().trim()
    if (!text || text.length === 0) {
      // If already selected, deselect by calling onSelect with null
      // The parent will handle deselecting all nodes first
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

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent, direction: ResizeDirection) => {
    e.stopPropagation()
    e.preventDefault()
    if (!isSelected || isEditing) return
    // Double check selection state immediately before starting
    if (!isSelected) return
    isResizingRef.current = true  // Set ref immediately
    setIsResizing(true)
    setResizeDirection(direction)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: node.width || 180,
      height: node.height || 60,
    })
  }

  useEffect(() => {
    if (!isResizing) return

    const handleResizeMove = (e: MouseEvent) => {
      // If node is no longer selected, cancel resize
      if (!isSelected) {
        isResizingRef.current = false
        setIsResizing(false)
        setResizeDirection(null)
        return
      }

      const dx = e.clientX - resizeStart.x
      const dy = e.clientY - resizeStart.y
      let newWidth = resizeStart.width
      let newHeight = resizeStart.height

      if (resizeDirection?.includes('e')) newWidth = Math.max(100, resizeStart.width + dx)
      if (resizeDirection?.includes('w')) newWidth = Math.max(100, resizeStart.width - dx)
      if (resizeDirection?.includes('s')) newHeight = Math.max(40, resizeStart.height + dy)
      if (resizeDirection?.includes('n')) newHeight = Math.max(40, resizeStart.height - dy)

      onResize?.({ width: newWidth, height: newHeight })
    }

    const handleResizeEnd = () => {
      isResizingRef.current = false  // Set ref to false before state update
      setIsResizing(false)
      setResizeDirection(null)
    }

    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)
    return () => {
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [isResizing, resizeDirection, resizeStart, node.width, node.height, onResize, isSelected])

  return (
    <div
      ref={nodeRef}
      className={`mindmap-node ${isSelected ? 'selected' : ''} ${externalIsDragging ? 'dragging' : ''}`}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: node.width || 'auto',
        height: node.height || 'auto',
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
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <div className="mindmap-node-content" ref={contentRef}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{node.text}</ReactMarkdown>
        </div>
      )}

      {/* Resize handles */}
      {isSelected && !isEditing && (
        <>
          <div className="resize-handle resize-se" onMouseDown={(e) => handleResizeStart(e, 'se')} />
          <div className="resize-handle resize-sw" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
          <div className="resize-handle resize-ne" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
          <div className="resize-handle resize-nw" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
          <div className="resize-handle resize-e" onMouseDown={(e) => handleResizeStart(e, 'e')} />
          <div className="resize-handle resize-w" onMouseDown={(e) => handleResizeStart(e, 'w')} />
          <div className="resize-handle resize-s" onMouseDown={(e) => handleResizeStart(e, 's')} />
          <div className="resize-handle resize-n" onMouseDown={(e) => handleResizeStart(e, 'n')} />
        </>
      )}

      {isSelected && !isEditing && (
        <div
          className="mindmap-node-actions"
          onMouseDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
        >
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