'use client'

import { useState, useRef, useCallback } from 'react'
import { useCanvasStore, Slide, Concept, ChatMessage } from '@/lib/canvas-store'

export default function SlideUploader() {
  const { addSlide, updateSlideSummary, addCard, setLastAiMessage } = useCanvasStore()
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentSlide, setCurrentSlide] = useState<Slide | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = async (file: File) => {
    setIsUploading(true)
    setProgress(0)
    setCurrentSlide(null)

    try {
      const slideId = `slide-${Date.now()}`

      const slide: Slide = {
        id: slideId,
        filename: file.name,
        content: '',
        concepts: [],
        uploadedAt: new Date(),
      }
      addSlide(slide)
      setCurrentSlide(slide)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 5, 70))
      }, 100)

      // Call backend API
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('http://localhost:3001/api/slides/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(80)

      if (response.ok) {
        const result = await response.json()
        console.log('Upload result:', result)

        // Wait for async processing
        await new Promise(resolve => setTimeout(resolve, 1500))

        setProgress(95)

        // Use result.id (not result.slideId)
        const processedSlide = result

        if (processedSlide.summary) {
          updateSlideSummary(slideId, processedSlide.summary, processedSlide.concepts || [])
          setCurrentSlide({ ...processedSlide, id: slideId })

          // Build analysis content
          const analysisContent = `文件 "${file.name}" 分析完成！\n\n总结：${processedSlide.summary}\n\n提取的概念：\n${
            processedSlide.concepts?.map((c: Concept, i: number) => `${i + 1}. ${c.title}`).join('\n') || '无'
          }`

          // Set AI message to display in ChatPanel
          const aiMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: analysisContent,
            timestamp: new Date(),
          }
          setLastAiMessage(aiMessage)

          // Send to backend as context for future conversation
          await fetch('http://localhost:3001/api/chat/context', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: 'default',
              role: 'assistant',
              content: analysisContent,
            }),
          })
        } else if (processedSlide.concepts?.length > 0) {
          updateSlideSummary(slideId, processedSlide.summary, processedSlide.concepts)
        } else {
          // Fallback
          const fallbackConcepts: Concept[] = [
            { id: `${slideId}-1`, slideId, title: '概念 1', description: '点击添加' },
            { id: `${slideId}-2`, slideId, title: '概念 2', description: '点击添加' },
          ]
          updateSlideSummary(slideId, '内容已解析，请选择概念添加', fallbackConcepts)
          setCurrentSlide({ ...slide, concepts: fallbackConcepts, summary: '内容已解析，请选择概念添加' })
        }
      }

      setProgress(100)
      setTimeout(() => setIsUploading(false), 500)
    } catch (error) {
      console.error('Upload failed:', error)
      setIsUploading(false)
      setProgress(0)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleConceptClick = (concept: Concept) => {
    addCard(concept)
  }

  const handleAddAllConcepts = () => {
    if (currentSlide?.concepts) {
      currentSlide.concepts.forEach(concept => {
        addCard(concept)
      })
    }
  }

  const handleAddSummaryCard = () => {
    if (!currentSlide) return
    const summaryCardConcept: Concept = {
      id: `summary-${Date.now()}`,
      slideId: currentSlide.id,
      title: `📄 ${currentSlide.filename || '文件摘要'}`,
      description: currentSlide.summary || '暂无摘要内容',
    }
    addCard(summaryCardConcept)
  }

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''} ${isUploading ? 'pointer-events-none' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pptx,.pdf,.png,.jpg,.jpeg"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {isUploading ? (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--primary-light)] flex items-center justify-center mx-auto">
              <div className="loading-spinner" />
            </div>
            <p className="text-base font-medium text-[var(--text-primary)]">正在解析文件...</p>
            <div className="progress-bar max-w-xs mx-auto">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <>
            <div className="upload-zone-icon">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3>上传 Slides</h3>
            <p>拖拽文件到此处，或点击选择文件</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-2">支持 PPTX, PDF, PNG, JPG</p>
          </>
        )}
      </div>

      {/* Concepts Selection - Only show after upload */}
      {currentSlide && currentSlide.concepts.length > 0 && (
        <div className="animate-fadeIn">
          {/* Header with close button */}
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">
              📚 提取的概念 ({currentSlide.concepts.length})
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddAllConcepts}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 transition-colors"
              >
                添加全部
              </button>
              <button
                onClick={() => setCurrentSlide(null)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--border)] transition-colors"
                title="关闭"
              >
                <svg className="w-3.5 h-3.5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Summary */}
          {currentSlide.summary && (
            <div className="card mb-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">📝 摘要</h4>
                <button
                  onClick={handleAddSummaryCard}
                  className="px-3 py-1 text-xs font-medium rounded-full bg-[var(--secondary)] text-white hover:bg-[var(--secondary)]/90 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  添加到画布
                </button>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {currentSlide.summary}
              </p>
            </div>
          )}

          {/* Concept list */}
          <div className="mb-4">
            <div className="space-y-2">
              {currentSlide.concepts.map((concept, index) => (
                <button
                  key={concept.id}
                  onClick={() => handleConceptClick(concept)}
                  className="w-full card text-left hover:border-[var(--primary)] transition-all group flex items-start gap-3"
                >
                  <div className="w-7 h-7 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center font-semibold text-xs flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-[var(--text-primary)] text-sm mb-0.5 group-hover:text-[var(--primary)] transition-colors">
                      {concept.title}
                    </h5>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                      {concept.description}
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-6 h-6 rounded bg-[var(--primary)] text-white flex items-center justify-center">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-center text-[var(--text-tertiary)]">
            点击概念添加到画布，或点击「添加全部」一键添加
          </p>
        </div>
      )}
    </div>
  )
}
