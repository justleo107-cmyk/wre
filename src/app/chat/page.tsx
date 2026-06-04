/* eslint-disable */
'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { 
  MessageSquare, 
  Send, 
  Lock, 
  Sparkles, 
  Building, 
  DollarSign, 
  ChevronRight, 
  Clock, 
  Compass,
  AlertCircle
} from 'lucide-react'
import confetti from 'canvas-confetti'

// Suspense Wrapper for Chat Page
export default function ChatPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
      </div>
    }>
      <ChatPage />
    </Suspense>
  )
}

function ChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

  // Chat specific state
  const [threads, setThreads] = useState<any[]>([])
  const [activeThread, setActiveThread] = useState<any>(null) // recipient profile
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [dealContext, setDealContext] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load URL search parameters if any
  const targetRecipientId = searchParams.get('recipient')
  const targetDealId = searchParams.get('deal')

  const loadInitialData = async () => {
    // 1. Fetch Auth User
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setCurrentUser(user)

    // 2. Chat is free for everyone
    const activeSub = true
    setIsSubscribed(activeSub)

    // 3. Load Deal Context if specified in query params
    if (targetDealId) {
      const { data: deal } = await supabase
        .from('deals')
        .select('*, profiles(username, full_name)')
        .eq('id', targetDealId)
        .single()
      setDealContext(deal)
    }

    // 4. Load recipient details if we are starting a new thread from the deal board
    if (targetRecipientId) {
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetRecipientId)
        .single()
      
      if (targetProfile) {
        setActiveThread(targetProfile)
      }
    }

    // 5. Fetch all existing message threads for user
    // In a real database, we'd query distinct sender/recipient relations.
    // For our MVP, we fetch all DMs involving the current user, then group by the other person on frontend.
    const { data: dms } = await supabase
      .from('messages')
      .select('*, sender:sender_id(id, username, full_name), recipient:recipient_id(id, username, full_name)')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: true })

    const loadedDms = dms || []
    
    // Group DMs into thread structures using a Map to avoid prototype pollution
    const groupedThreadsMap = new Map<string, any>()
    loadedDms.forEach(msg => {
      const otherUser = msg.sender_id === user.id ? msg.recipient : msg.sender
      if (!otherUser) return
      
      if (!groupedThreadsMap.has(otherUser.id)) {
        groupedThreadsMap.set(otherUser.id, {
          profile: otherUser,
          lastMessage: msg.content,
          timestamp: msg.created_at,
          messages: []
        })
      }
      const thread = groupedThreadsMap.get(otherUser.id)
      thread.messages.push(msg)
      thread.lastMessage = msg.content
      thread.timestamp = msg.created_at
    })

    const threadsList = Array.from(groupedThreadsMap.values())
    setThreads(threadsList)

    // Set active thread messages if not already set by targetRecipient
    if (targetRecipientId) {
      const existingThread = groupedThreadsMap.get(targetRecipientId)
      setMessages(existingThread ? existingThread.messages : [])
    } else if (threadsList.length > 0) {
      setActiveThread(threadsList[0].profile)
      setMessages(threadsList[0].messages)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadInitialData()
  }, [supabase, targetRecipientId, targetDealId])

  // Setup Real-time listener for new messages
  useEffect(() => {
    if (!currentUser || !isSubscribed) return

    const channel = supabase
      .channel('realtime_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload: any) => {
          const newMsg = payload.new
          // Check if message belongs to current user (either sender or receiver)
          if (newMsg.sender_id === currentUser.id || newMsg.recipient_id === currentUser.id) {
            // If it belongs to our active chat thread, append to messages
            if (
              activeThread &&
              ((newMsg.sender_id === currentUser.id && newMsg.recipient_id === activeThread.id) ||
               (newMsg.sender_id === activeThread.id && newMsg.recipient_id === currentUser.id))
            ) {
              setMessages(prev => [...prev, newMsg])
            }
            
            // Reload thread list to update previews
            loadInitialData()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser, isSubscribed, activeThread])

  // Auto scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeThread || !currentUser) return

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUser.id,
          recipient_id: activeThread.id,
          deal_id: dealContext?.id || null,
          content: newMessage.trim(),
          is_read: false
        })

      if (error) throw error
      setNewMessage('')
    } catch (err) {
      console.error('Error sending message:', err)
      alert('Failed to send message. Ensure your subscription is active.')
    }
  }

  const handleSelectThread = (thread: any) => {
    setActiveThread(thread.profile)
    setMessages(thread.messages)
    setDealContext(null) // clear query context
  }

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex flex-col items-center justify-center p-12">
          <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Opening chat console...</p>
        </div>
      </SidebarLayout>
    )
  }

  return (
    <SidebarLayout>
      <div className="h-[calc(100vh-8rem)] relative rounded-2xl border border-gray-900 overflow-hidden flex bg-slate-950">
        
        {/* PAYWALL BLUR INTERCEPTOR */}
        {!isSubscribed && (
          <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="glass-panel border border-gray-800 rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">
              <div className="inline-flex p-4 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 mb-4">
                <Lock className="w-8 h-8" />
              </div>

              <h3 className="text-base font-black text-white mb-2">Subscriber Messaging Block</h3>
              <p className="text-xs text-gray-400 max-w-xs mx-auto mb-6 leading-relaxed">
                Joint Venture messaging and negotiations are gated behind our premium membership. Unlock messaging to directly pitch cash buyers and close deals.
              </p>

              <div className="bg-slate-950/80 border border-gray-900 rounded-xl p-4 max-w-xs mx-auto mb-6 text-left space-y-2">
                <div className="text-[10px] uppercase font-bold text-gray-500">Subscribers Unlock:</div>
                <div className="text-xs text-gray-300">✓ Unlimited JV Chat Direct Messages</div>
                <div className="text-xs text-gray-300">✓ +250 Calculator Credits / mo 🪙</div>
                <div className="text-xs text-gray-300">✓ Custom Badge Drawer Rank Upgrades</div>
              </div>

              <button
                type="button"
                onClick={() => router.push('/pricing')}
                className="w-full bg-gradient-to-r from-violet-600 via-purple-600 to-emerald-600 hover:from-violet-500 hover:to-emerald-500 text-white text-xs font-bold py-2.5 rounded-lg shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Unlock Chat & Get Credits</span>
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Chat Pane Layout (Subscribed View) */}
        {/* Left Panel: Threads List */}
        <div className="w-1/3 border-r border-gray-900 bg-slate-950/40 flex flex-col">
          <div className="p-4 border-b border-gray-900 shrink-0">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-violet-400" />
              <span>JV Conversations</span>
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
            {threads.length === 0 && !activeThread ? (
              <div className="text-center py-12 text-[10px] text-gray-600 font-medium">No active threads.</div>
            ) : (
              <>
                {/* Temp active thread preview if started from scratch */}
                {activeThread && !threads.some(t => t.profile.id === activeThread.id) && (
                  <div className="p-3 rounded-lg border border-violet-500/30 bg-violet-500/5 cursor-pointer">
                    <div className="text-xs font-bold text-white">{activeThread.full_name}</div>
                    <div className="text-[9px] text-gray-500">@{activeThread.username}</div>
                    <div className="text-[10px] text-violet-400 font-bold mt-1">Starting new chat...</div>
                  </div>
                )}

                {threads.map((t) => {
                  const active = activeThread?.id === t.profile.id
                  return (
                    <div
                      key={t.profile.id}
                      onClick={() => handleSelectThread(t)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        active 
                          ? 'border-violet-500 bg-violet-500/5' 
                          : 'border-gray-900/60 bg-slate-900/10 hover:bg-slate-900/30 hover:border-gray-800'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-0.5">
                        <span className="text-xs font-bold text-white truncate max-w-[120px]">{t.profile.full_name}</span>
                        <span className="text-[8px] text-gray-500">
                          {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 truncate leading-relaxed">{t.lastMessage}</p>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>

        {/* Right Panel: Active Chat Stream */}
        <div className="flex-1 flex flex-col justify-between bg-slate-900/10">
          {activeThread ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-900 bg-slate-950/40 shrink-0">
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-white">{activeThread.full_name}</h4>
                    <p className="text-[9px] text-gray-500">@{activeThread.username}</p>
                  </div>
                </div>

                {/* Deal Context Alert Banner if active */}
                {dealContext && (
                  <div className="mt-3 p-2 bg-slate-950 rounded-lg border border-gray-800 flex justify-between items-center text-[10px]">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Building className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                      <span className="font-bold truncate max-w-[200px]">{dealContext.address}</span>
                      <span className="text-emerald-400 font-bold">${Number(dealContext.asking_price).toLocaleString()}</span>
                    </div>
                    <span className="text-[8px] uppercase px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-black">
                      JV Subject
                    </span>
                  </div>
                )}
              </div>

              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-600">
                    <MessageSquare className="w-8 h-8 opacity-30 mb-2" />
                    <h5 className="text-xs font-bold text-gray-400">No messages yet</h5>
                    <p className="text-[9px]">Send a greeting to initiate collaboration terms.</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isMe = msg.sender_id === currentUser.id
                    return (
                      <div 
                        key={msg.id || index} 
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] rounded-xl p-3 text-xs leading-relaxed ${
                          isMe 
                            ? 'bg-violet-600 text-white rounded-tr-none' 
                            : 'bg-slate-900 border border-gray-800 text-gray-200 rounded-tl-none'
                        }`}>
                          <p className="font-medium">{msg.content}</p>
                          <div className={`text-[8px] text-right mt-1.5 ${isMe ? 'text-violet-200' : 'text-gray-500'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Entry Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-900 bg-slate-950/40 shrink-0 flex gap-2">
                <input
                  type="text"
                  placeholder="Type negotiation message or co-wholesale offer details..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
                <button
                  type="submit"
                  className="bg-violet-600 hover:bg-violet-500 text-white p-2 rounded-lg transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-600">
              <MessageSquare className="w-10 h-10 opacity-30 mb-3" />
              <h5 className="text-xs font-bold text-gray-400">Select a Conversation Thread</h5>
              <p className="text-[9px] max-w-xs mx-auto leading-relaxed">
                Click on a message thread from the sidebar or click "JV Chat" on a property from the Deal Feed to begin negotiating assignment splits.
              </p>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  )
}
