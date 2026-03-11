import { useState, useRef, useEffect } from 'react'
import { ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react'
import { ViSakhaChatInput } from '@/components/ui/vi-sakha-chat-input'
import { sendChatMessage, addMessageFeedback, type ChatMessage, type SendMessageResponse } from '@/lib/api'

/**
 * Simple markdown renderer for chat messages
 * Handles: **bold**, *italic*, - lists, numbered lists
 */
function renderMarkdown(text: string): JSX.Element {
  const lines = text.split('\n')
  const elements: JSX.Element[] = []
  let listItems: string[] = []
  let listType: 'ul' | 'ol' | null = null

  const processInline = (line: string): JSX.Element => {
    // Process **bold** and *italic*
    const parts: (string | JSX.Element)[] = []
    let remaining = line
    let key = 0

    while (remaining.length > 0) {
      // Check for **bold**
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
      // Check for *italic* (but not **)
      const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/)
      
      const boldIdx = boldMatch ? remaining.indexOf(boldMatch[0]) : -1
      const italicIdx = italicMatch ? remaining.indexOf(italicMatch[0]) : -1

      if (boldIdx !== -1 && (italicIdx === -1 || boldIdx <= italicIdx)) {
        if (boldIdx > 0) parts.push(remaining.substring(0, boldIdx))
        parts.push(<strong key={key++} className="font-semibold">{boldMatch![1]}</strong>)
        remaining = remaining.substring(boldIdx + boldMatch![0].length)
      } else if (italicIdx !== -1) {
        if (italicIdx > 0) parts.push(remaining.substring(0, italicIdx))
        parts.push(<em key={key++}>{italicMatch![1]}</em>)
        remaining = remaining.substring(italicIdx + italicMatch![0].length)
      } else {
        parts.push(remaining)
        remaining = ''
      }
    }

    return <>{parts}</>
  }

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const ListTag = listType
      elements.push(
        <ListTag key={elements.length} className={`${listType === 'ul' ? 'list-disc' : 'list-decimal'} ml-4 space-y-1`}>
          {listItems.map((item, i) => (
            <li key={i}>{processInline(item)}</li>
          ))}
        </ListTag>
      )
      listItems = []
      listType = null
    }
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim()
    
    // Unordered list
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      if (listType !== 'ul') flushList()
      listType = 'ul'
      listItems.push(trimmed.substring(2))
    }
    // Ordered list
    else if (/^\d+\.\s/.test(trimmed)) {
      if (listType !== 'ol') flushList()
      listType = 'ol'
      listItems.push(trimmed.replace(/^\d+\.\s/, ''))
    }
    // Regular paragraph
    else {
      flushList()
      if (trimmed) {
        elements.push(<p key={idx} className="mb-2 last:mb-0">{processInline(trimmed)}</p>)
      } else if (idx > 0 && idx < lines.length - 1) {
        elements.push(<br key={idx} />)
      }
    }
  })

  flushList()
  return <>{elements}</>
}

interface ChatViewProps {
  onRaiseTicket: () => void
  studentInfo?: {
    studentId?: string
    studentName?: string
    studentEmail?: string
    cohort?: string
  }
}

export function ChatView({ onRaiseTicket, studentInfo }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (data: { message: string; files: unknown[] }) => {
    if (!data.message.trim() || isLoading) return

    setIsLoading(true)
    setError(null)

    // Add user message optimistically
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: data.message,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMessage])

    try {
      const response: SendMessageResponse = await sendChatMessage(
        data.message,
        conversationId ?? undefined,
        studentInfo
      )

      // Update conversation ID if this is a new conversation
      if (!conversationId) {
        setConversationId(response.conversationId)
      }

      // Replace temp user message and add assistant message
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMessage.id),
        response.userMessage,
        response.assistantMessage,
      ])
    } catch (err) {
      setError('Failed to send message. Please try again.')
      // Remove optimistic user message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id))
    } finally {
      setIsLoading(false)
    }
  }

  const handleFeedback = async (messageId: string, feedback: 'like' | 'dislike') => {
    try {
      await addMessageFeedback(messageId, feedback)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, feedback } : m
        )
      )
    } catch {
      console.error('Failed to save feedback')
    }
  }

  const handleQuickQuestion = (question: string) => {
    handleSendMessage({ message: question, files: [] })
  }

  // Empty state
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-48px)] px-4">
        <div className="w-20 h-20 mx-auto mb-6 bg-gray-900 rounded-2xl flex items-center justify-center">
          <span className="text-white font-bold text-2xl">VS</span>
        </div>
        <h2 className="text-2xl font-serif text-gray-900 mb-2">
          {getGreeting()}, <span className="italic">{studentInfo?.studentName || 'Student'}</span>
        </h2>
        <p className="text-gray-400 text-sm mb-8">Ask me anything about VInternship</p>
        <ViSakhaChatInput
          onSendMessage={handleSendMessage}
          onRaiseTicket={onRaiseTicket}
          disabled={isLoading}
        />
        {/* Quick suggestion pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-2xl">
          {[
            'What is my HP score?',
            'Case study deadlines',
            'ViBe module status',
            'Ejection policy',
          ].map((q) => (
            <button
              key={q}
              onClick={() => handleQuickQuestion(q)}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-full hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
        {error && (
          <div className="mt-4 text-red-500 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    )
  }

  // Chat view with messages
  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">VS</span>
                </div>
              )}

              <div
                className={`max-w-[70%] ${
                  message.role === 'user'
                    ? 'bg-gray-900 text-white rounded-2xl rounded-br-md px-4 py-3'
                    : 'bg-gray-50 text-gray-900 rounded-2xl rounded-bl-md px-4 py-3'
                }`}
              >
                <div className="text-sm leading-relaxed">
                  {message.role === 'assistant' 
                    ? renderMarkdown(message.content)
                    : <p className="whitespace-pre-wrap">{message.content}</p>
                  }
                </div>

                {/* Assistant message - only feedback buttons */}
                {message.role === 'assistant' && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    {/* Escalation notice */}
                    {message.isEscalated && (
                      <div className="flex items-center gap-2 mb-2 text-amber-600">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="text-xs">This query has been escalated for review</span>
                      </div>
                    )}

                    {/* Like/Dislike buttons */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400 mr-2">Was this helpful?</span>
                      <button
                        onClick={() => handleFeedback(message.id, 'like')}
                        className={`p-1.5 rounded-md transition-colors ${
                          message.feedback === 'like'
                            ? 'bg-green-100 text-green-600'
                            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                        }`}
                        title="Helpful"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleFeedback(message.id, 'dislike')}
                        className={`p-1.5 rounded-md transition-colors ${
                          message.feedback === 'dislike'
                            ? 'bg-red-100 text-red-600'
                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                        title="Not helpful"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 text-xs font-semibold">
                    {(studentInfo?.studentName || 'S')[0].toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">VS</span>
              </div>
              <div className="bg-gray-50 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-600 text-sm text-center">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <div className="max-w-3xl mx-auto">
          <ViSakhaChatInput
            onSendMessage={handleSendMessage}
            onRaiseTicket={onRaiseTicket}
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
