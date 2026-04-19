import { useState, useRef, useEffect, useCallback } from 'react'
import { ThumbsUp, ThumbsDown, AlertCircle, X, Loader2, CheckCircle2 } from 'lucide-react'
import { ViSakhaChatInput } from '@/components/ui/vi-sakha-chat-input'
import { sendChatMessageStream, addMessageFeedback, postFeedback, getConversation, createTicket, type ChatMessage, type ChatStreamEvent } from '@/lib/api'
import { getUser } from '@/lib/auth'

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
    // Headings
    else if (trimmed.startsWith('### ')) {
      flushList()
      elements.push(<h3 key={idx} className="text-lg font-bold mt-4 mb-2 text-gray-900">{processInline(trimmed.substring(4))}</h3>)
    }
    else if (trimmed.startsWith('## ')) {
      flushList()
      elements.push(<h2 key={idx} className="text-xl font-bold mt-5 mb-3 text-gray-900">{processInline(trimmed.substring(3))}</h2>)
    }
    else if (trimmed.startsWith('# ')) {
      flushList()
      elements.push(<h1 key={idx} className="text-2xl font-bold mt-6 mb-4 text-gray-900">{processInline(trimmed.substring(2))}</h1>)
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
  activeConversationId?: string | null
  onConversationCreated?: (id: string) => void
  onMessageSent?: () => void
}

export function ChatView({ onRaiseTicket, studentInfo, activeConversationId, onConversationCreated, onMessageSent }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // Tracks which conversationId was last loaded so we skip redundant reloads
  const loadedConvIdRef = useRef<string | null>(null)
  // Smart auto-scroll: only follow stream if user hasn't scrolled up
  const userScrolledUpRef = useRef(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  const [dislikeModalContext, setDislikeModalContext] = useState<{
    conversationId: string;
    messageId: string;
    originalQuery: string;
    botResponse: string;
  } | null>(null)
  const [ticketCreationLoading, setTicketCreationLoading] = useState(false)
  const [ticketCreationSuccess, setTicketCreationSuccess] = useState(false)
  
  // Example: user role and ticketId should be passed as props or context
  const authUser = getUser()
  const user = { role: authUser?.role ?? 'student' }
  const ticketId = 'example-ticket-id' // Replace with actual ticketId
  // Unread message count (mock, replace with actual logic)
  const unreadCount = Array.isArray(messages)
    ? messages.filter(m => (m as any).unreadByUserIds && (m as any).unreadByUserIds.includes(user.role)).length
    : 0;

  // Smart auto-scroll: follow new content unless user scrolled up
  const scrollToBottom = useCallback(() => {
    if (!userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Track manual scroll
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      // If user is near the bottom (within 80px), consider them "following"
      userScrolledUpRef.current = scrollHeight - scrollTop - clientHeight > 80
    }
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Load messages when switching conversations via sidebar
  useEffect(() => {
    if (activeConversationId === undefined) return

    if (!activeConversationId) {
      setMessages([])
      setConversationId(null)
      loadedConvIdRef.current = null
      return
    }

    // Skip if we just created this conversation in handleSendMessage (messages already in state)
    if (activeConversationId === loadedConvIdRef.current) return

    loadedConvIdRef.current = activeConversationId
    setConversationId(activeConversationId)
    setMessages([])

    getConversation(activeConversationId)
      .then(({ messages: loaded }) => {
        setMessages(
          loaded.map((m) => ({
            id: String(m.id),
            role: m.role as 'user' | 'assistant',
            content: m.content,
            createdAt: m.createdAt,
            feedback: m.feedback as 'like' | 'dislike' | undefined,
            isEscalated: m.isEscalated,
            confidence: m.confidence,
            sources: m.sources,
          }))
        )
      })
      .catch(() => {})
  }, [activeConversationId])

  const handleSendMessage = async (data: { message: string; files: unknown[] }) => {
    if (!data.message.trim() || isLoading || isStreaming) return

    setIsLoading(true)
    setIsStreaming(false)
    setError(null)
    userScrolledUpRef.current = false  // reset scroll lock on new message

    // Add user message optimistically
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: data.message,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMessage])

    // Prepare a placeholder for the streaming assistant message
    const streamingMsgId = `streaming-${Date.now()}`

    let isEscalatedResponse = false

    try {
      await sendChatMessageStream(
        data.message,
        (event: ChatStreamEvent) => {
          switch (event.type) {
            case 'metadata': {
              // Got the real conversation + user message IDs
              if (!conversationId) {
                loadedConvIdRef.current = event.conversationId
                setConversationId(event.conversationId)
                onConversationCreated?.(event.conversationId)
              }
              // Replace temp user message ID with real one
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempUserMessage.id
                    ? { ...m, id: event.userMessageId }
                    : m
                )
              )
              // Add streaming assistant placeholder
              setIsLoading(false)
              setIsStreaming(true)
              setMessages((prev) => [
                ...prev,
                {
                  id: streamingMsgId,
                  role: 'assistant' as const,
                  content: '',
                  createdAt: new Date().toISOString(),
                },
              ])
              break
            }
            case 'sources': {
              if (event.status === 'escalated') {
                isEscalatedResponse = true
              }
              // Attach sources + metadata to the streaming message
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamingMsgId
                    ? {
                        ...m,
                        confidence: event.confidence,
                        sources: event.sources,
                        isEscalated: event.status === 'escalated',
                      }
                    : m
                )
              )
              break
            }
            case 'delta': {
              // Append text token to the streaming message
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamingMsgId
                    ? { ...m, content: m.content + event.text }
                    : m
                )
              )
              scrollToBottom()
              break
            }
            case 'done': {
              // Replace streaming ID with real persisted ID
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamingMsgId
                    ? { ...m, id: event.assistantMessageId }
                    : m
                )
              )

              // If this was an escalated response, trigger the ticket modal proactively
              if (isEscalatedResponse) {
                setTimeout(() => {
                  setDislikeModalContext({
                    conversationId: loadedConvIdRef.current || conversationId || '',
                    messageId: event.assistantMessageId,
                    originalQuery: data.message,
                    botResponse: 'Low confidence escalation',
                  })
                }, 800)
              }
              break
            }
            case 'error': {
              setError(event.message)
              break
            }
          }
        },
        conversationId ?? undefined,
        studentInfo
      )

      onMessageSent?.()
    } catch (err) {
      setError('Failed to send message. Please try again.')
      // Remove optimistic messages on error
      setMessages((prev) =>
        prev.filter((m) => m.id !== tempUserMessage.id && m.id !== streamingMsgId)
      )
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  const handleFeedback = async (messageId: string, feedback: 'like' | 'dislike') => {
    // Prevent duplicate submissions — once feedback is set, ignore further clicks
    const message = messages.find((m) => m.id === messageId)
    if (!message || message.feedback) return

    try {
      await addMessageFeedback(messageId, feedback)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, feedback } : m
        )
      )

      if (feedback === 'dislike' && conversationId) {
        const currentIdx = messages.findIndex(m => m.id === messageId);
        let query = 'Unknown Query';
        for (let i = currentIdx - 1; i >= 0; i--) {
          if (messages[i].role === 'user') {
            query = messages[i].content;
            break;
          }
        }
        
        setDislikeModalContext({
          conversationId,
          messageId,
          originalQuery: query,
          botResponse: message.content
        });
        setTicketCreationSuccess(false);
      }

      // Store analytics feedback with topic classification (fire-and-forget)
      if (conversationId) {
        postFeedback({
          conversationId,
          messageId,
          rating: feedback === 'like' ? 'up' : 'down',
          messageContent: message.content,
        }).catch(() => {})
      }
    } catch {
      console.error('Failed to save feedback')
    }
  }

  const handleRaiseTicketFromDislike = async () => {
    if (!dislikeModalContext) return;
    setTicketCreationLoading(true);
    try {
      await createTicket({
        studentName: studentInfo?.studentName || 'Student',
        studentEmail: studentInfo?.studentEmail,
        cohort: studentInfo?.cohort,
        subject: `Chatbot Clarification Request: ${dislikeModalContext.originalQuery.substring(0, 30)}...`,
        reason: 'User provided negative feedback for a chatbot response and raised a support ticket directly from the chat.',
        conversationId: dislikeModalContext.conversationId,
        messageId: dislikeModalContext.messageId,
        originalQuery: dislikeModalContext.originalQuery,
        botResponse: dislikeModalContext.botResponse,
      });
      setTicketCreationSuccess(true);
      setTimeout(() => {
        setDislikeModalContext(null);
        setTicketCreationSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to create ticket from dislike modal', err);
    } finally {
      setTicketCreationLoading(false);
    }
  }

  const handleQuickQuestion = (question: string) => {
    handleSendMessage({ message: question, files: [] })
  }

  // Empty state
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-screen px-4">
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
          disabled={isLoading || isStreaming}
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
              disabled={isLoading || isStreaming}
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
    <div className="flex flex-col h-full min-h-screen relative">
      {/* ── Dislike Feedback Modal ── */}
      {dislikeModalContext && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-gray-100">
            {ticketCreationSuccess ? (
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Ticket Created</h3>
                <p className="text-sm text-gray-500 mb-6">A lab member will review this conversation and provide a personalized response shortly.</p>
                <button 
                  onClick={() => { setDislikeModalContext(null); setTicketCreationSuccess(false) }}
                  className="w-full bg-gray-900 text-white rounded-xl py-2.5 font-semibold hover:bg-black transition-colors"
                >
                  Return to Chat
                </button>
              </div>
            ) : (
              <>
                <div className="p-5 border-b border-gray-100 flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 leading-snug">Need more help?</h3>
                    <p className="text-xs text-gray-500 mt-1">Sorry that the response didn't meet your expectations.</p>
                  </div>
                  <button onClick={() => setDislikeModalContext(null)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-5 bg-gray-50/50">
                  <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                    If this response was not helpful, you can raise a support ticket. A team member will be assigned to review the context and assist you with a personalized solution.
                  </p>
                  <div className="flex flex-col gap-2.5">
                    <button 
                      onClick={handleRaiseTicketFromDislike}
                      disabled={ticketCreationLoading}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gray-900 to-black text-white rounded-xl py-2.5 font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                    >
                      {ticketCreationLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {ticketCreationLoading ? 'Creating...' : 'Raise Ticket'}
                    </button>
                    <button 
                      onClick={() => setDislikeModalContext(null)}
                      disabled={ticketCreationLoading}
                      className="w-full bg-white border border-gray-200 text-gray-700 rounded-xl py-2.5 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Unread badge */}
      {unreadCount > 0 && (
        <div className="absolute top-2 right-2 bg-red-500 text-white rounded-full px-2 py-1 text-xs font-bold">
          {unreadCount} unread
        </div>
      )}
      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((message) => (
            message.type === 'meeting' ? (
              <div key={message.id} className="flex gap-3 justify-center">
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 w-full max-w-md">
                  <div className="font-semibold text-blue-700 mb-1">Support Session Started</div>
                  <div className="text-sm mb-2">Join Meeting:</div>
                  <a href={message.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition">Join Now</a>
                </div>
              </div>
            ) : (
              // ...existing code...
              <div
                key={message.id}
                className="flex gap-4 w-full py-5 border-b border-gray-100 last:border-0"
              >
                {/* Avatar */}
                {message.role === 'assistant' ? (
                  <div className="w-8 h-8 rounded-sm bg-gray-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">VS</span>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs font-semibold">
                      {(studentInfo?.studentName || 'S')[0].toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="font-semibold text-gray-900 text-[15px]">
                    {message.role === 'assistant' ? 'Vi-Sakha' : studentInfo?.studentName || 'You'}
                  </div>
                <div className="text-[15px] text-gray-800 leading-relaxed prose prose-sm max-w-none">
                    {message.role === 'assistant' 
                      ? (
                        <>
                          {/* Show typing dots while streaming placeholder has no content */}
                          {message.id.startsWith('streaming-') && !message.content ? (
                            <div className="flex items-center gap-1.5 mt-2 h-[22px]">
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          ) : (
                            <>
                              {renderMarkdown(message.content)}
                              {/* Blinking cursor while actively streaming */}
                              {message.id.startsWith('streaming-') && (
                                <span className="inline-block w-[2px] h-[18px] bg-gray-800 ml-0.5 align-text-bottom animate-pulse" />
                              )}
                            </>
                          )}
                        </>
                      )
                      : <p className="whitespace-pre-wrap">{message.content}</p>
                    }
                  </div>
                  
                  {/* Only show feedback AFTER streaming is complete (not for streaming placeholders) */}
                  {message.role === 'assistant' && !message.id.startsWith('streaming-') && (
                    <div className="mt-3 flex items-center gap-1">
                      {message.isEscalated && (
                        <div className="flex items-center gap-2 mr-4 text-amber-600">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">Escalated for review</span>
                        </div>
                      )}
                      
                      {/* Only label feedback if neither like/dislike has been clicked */}
                      {!message.feedback && (
                        <span className="text-xs font-medium text-gray-400 mr-2">Was this helpful?</span>
                      )}
                      
                      <button
                        onClick={() => handleFeedback(message.id, 'like')}
                        disabled={!!message.feedback}
                        className={`p-1.5 rounded-md transition-colors disabled:cursor-not-allowed ${
                          message.feedback === 'like'
                            ? 'bg-green-50 text-green-600'
                            : message.feedback === 'dislike' 
                              ? 'hidden' 
                              : 'text-gray-400 hover:text-green-600 hover:bg-gray-100'
                        }`}
                        title="Helpful"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      
                      <button
                        onClick={() => handleFeedback(message.id, 'dislike')}
                        disabled={!!message.feedback}
                        className={`p-1.5 rounded-md transition-colors disabled:cursor-not-allowed ${
                          message.feedback === 'dislike'
                            ? 'bg-red-50 text-red-600'
                            : message.feedback === 'like'
                              ? 'hidden'
                              : 'text-gray-400 hover:text-red-600 hover:bg-gray-100'
                        }`}
                        title="Not helpful"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          ))}

          {/* Loading indicator — waiting for stream to start */}
          {isLoading && (
            <div className="flex gap-4 w-full py-5 border-b border-gray-100 last:border-0">
              <div className="w-8 h-8 rounded-sm bg-gray-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">VS</span>
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="font-semibold text-gray-900 text-[15px]">
                  Vi-Sakha
                </div>
                <div className="flex items-center gap-1.5 mt-2 h-[22px]">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
              {/* Instructor-only Start Support Session button */}
              {(user.role === 'lab_member' || user.role === 'admin') && (
                <div className="mb-4">
                  <button
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition"
                    onClick={async () => {
                      // Call backend to start meeting
                      const res = await fetch(`/api/tickets/start-meeting`, {
                        method: 'POST',
                        body: JSON.stringify({ ticketId }),
                        headers: { 'Content-Type': 'application/json' },
                      });
                      const data = await res.json();
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: `meeting-${Date.now()}`,
                          type: 'meeting',
                          content: 'Instructor started a support session.',
                          meetingLink: data.meetingLink,
                          role: 'system',
                          createdAt: new Date().toISOString(),
                        },
                      ]);
                    }}
                  >
                    Start Support Session
                  </button>
                </div>
              )}
        <div className="max-w-3xl mx-auto">
          <ViSakhaChatInput
            onSendMessage={handleSendMessage}
            onRaiseTicket={onRaiseTicket}
            disabled={isLoading || isStreaming}
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
