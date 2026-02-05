"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { X, Send, ChevronLeft, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useSession } from "next-auth/react"

type SupportMessage = {
  id: string
  sender: "user" | "admin"
  senderName: string
  content: string
  createdAt: string
}

type SupportTicket = {
  id: string
  status: "open" | "replied" | "closed"
  subject: string
  messages: SupportMessage[]
  createdAt: string
  updatedAt: string
}

type View = "list" | "chat" | "new"

export function SupportChat({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { data: session, status: sessionStatus } = useSession()
  const [view, setView] = useState<View>("list")
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  // New ticket form
  const [newSubject, setNewSubject] = useState("")
  const [newMessage, setNewMessage] = useState("")

  // Reply form
  const [replyMessage, setReplyMessage] = useState("")

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const activeTicketIdRef = useRef<string | null>(null)

  // Keep ref in sync with state
  useEffect(() => {
    activeTicketIdRef.current = activeTicket?.id || null
  }, [activeTicket])

  const loadTickets = useCallback(async () => {
    if (sessionStatus !== "authenticated") return
    setLoading(true)
    try {
      // Add timestamp to bust cache
      const res = await fetch(`/api/support?_t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
      })
      const data = await res.json()
      console.log("[support] Loaded tickets:", data)
      if (data.ok) {
        const newTickets = data.tickets || []
        setTickets(newTickets)

        // Update activeTicket with fresh data if it exists
        const currentActiveId = activeTicketIdRef.current
        if (currentActiveId) {
          const updated = newTickets.find((t: SupportTicket) => t.id === currentActiveId)
          if (updated) {
            setActiveTicket(updated)
          }
        }
      }
    } catch (err) {
      console.error("[support] Failed to load tickets:", err)
    } finally {
      setLoading(false)
    }
  }, [sessionStatus])

  useEffect(() => {
    if (isOpen && sessionStatus === "authenticated") {
      loadTickets()
    } else if (!isOpen) {
      // Reset state when closed
      setView("list")
      setActiveTicket(null)
      activeTicketIdRef.current = null
    }
  }, [isOpen, sessionStatus, loadTickets])

  // Auto-refresh when in chat view to get admin replies
  useEffect(() => {
    if (!isOpen || view !== "chat" || !activeTicket) return

    const interval = setInterval(() => {
      loadTickets()
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [isOpen, view, activeTicket, loadTickets])

  useEffect(() => {
    if (view === "chat" && activeTicket) {
      scrollToBottom()
    }
  }, [view, activeTicket?.messages.length])

  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return
    setSending(true)
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          subject: newSubject,
          message: newMessage,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setNewSubject("")
        setNewMessage("")
        setActiveTicket(data.ticket)
        setView("chat")
        await loadTickets()
      }
    } catch (err) {
      console.error("[support] Failed to create ticket:", err)
    } finally {
      setSending(false)
    }
  }

  const handleReply = async () => {
    if (!replyMessage.trim() || !activeTicket) return
    setSending(true)
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          ticketId: activeTicket.id,
          message: replyMessage,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setReplyMessage("")
        setActiveTicket(data.ticket)
        await loadTickets()
      }
    } catch (err) {
      console.error("[support] Failed to reply:", err)
    } finally {
      setSending(false)
    }
  }

  const openTicket = async (ticket: SupportTicket) => {
    // Fetch fresh ticket data
    try {
      const res = await fetch(`/api/support?ticketId=${ticket.id}&_t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
      })
      const data = await res.json()
      if (data.ok && data.ticket) {
        setActiveTicket(data.ticket)
      } else {
        setActiveTicket(ticket)
      }
    } catch (err) {
      console.error("[support] Failed to fetch ticket:", err)
      setActiveTicket(ticket)
    }
    setView("chat")
  }

  const formatTime = (iso: string) => {
    const date = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (mins < 1) return "Одоо"
    if (mins < 60) return `${mins}м өмнө`
    if (hours < 24) return `${hours}ц өмнө`
    return `${days}өдөр өмнө`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Хүлээгдэж буй</Badge>
      case "replied":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Хариу ирсэн</Badge>
      case "closed":
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">Хаагдсан</Badge>
      default:
        return null
    }
  }

  if (sessionStatus !== "authenticated" || !isOpen) {
    return null
  }

  return (
    <>
      {/* Chat Window */}
      <div className="fixed bottom-6 left-6 md:left-72 z-50 w-80 md:w-96 rounded-xl border bg-background shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center justify-between">
              {view !== "list" && (
                <button
                  onClick={() => {
                    setView("list")
                    setActiveTicket(null)
                  }}
                  className="mr-2 hover:opacity-80"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <div className="flex-1">
                <h3 className="font-semibold">
                  {view === "list" && "Тусламж"}
                  {view === "new" && "Шинэ хүсэлт"}
                  {view === "chat" && (activeTicket?.subject || "Харилцан яриа")}
                </h3>
                <p className="text-xs opacity-80">
                  {view === "list" && "Асуулт, санал хүсэлтээ бичээрэй"}
                  {view === "new" && "Таны мессежийг бид хүлээн авна"}
                  {view === "chat" && getStatusBadge(activeTicket?.status || "")}
                </p>
              </div>
              <button onClick={onClose} className="hover:opacity-80">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="h-80 overflow-y-auto">
            {/* List View */}
            {view === "list" && (
              <div className="p-3 space-y-2">
                <Button
                  onClick={() => setView("new")}
                  className="w-full flex items-center gap-2"
                  variant="outline"
                >
                  <Plus className="h-4 w-4" />
                  Шинэ хүсэлт илгээх
                </Button>

                {loading ? (
                  <p className="text-center text-sm text-muted-foreground py-4">Ачааллаж байна...</p>
                ) : tickets.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    Одоогоор хүсэлт байхгүй байна
                  </p>
                ) : (
                  <div className="space-y-2">
                    {tickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        onClick={() => openTicket(ticket)}
                        className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{ticket.subject}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {ticket.messages[ticket.messages.length - 1]?.content}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            {getStatusBadge(ticket.status)}
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatTime(ticket.updatedAt)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* New Ticket View */}
            {view === "new" && (
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Гарчиг</label>
                  <Input
                    placeholder="Жишээ: Signal ирэхгүй байна"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Мессеж</label>
                  <Textarea
                    placeholder="Таны асуулт, санал хүсэлтийг бичнэ үү..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={5}
                  />
                </div>
              </div>
            )}

            {/* Chat View */}
            {view === "chat" && activeTicket && (
              <div className="p-3 space-y-3">
                {activeTicket.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        msg.sender === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.sender === "user" ? "opacity-70" : "text-muted-foreground"}`}>
                        {msg.senderName} • {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Footer/Input */}
          {view === "new" && (
            <div className="border-t p-3">
              <Button
                onClick={handleCreateTicket}
                disabled={sending || !newSubject.trim() || !newMessage.trim()}
                className="w-full"
              >
                {sending ? "Илгээж байна..." : "Илгээх"}
              </Button>
            </div>
          )}

          {view === "chat" && activeTicket?.status !== "closed" && (
            <div className="border-t p-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Хариу бичих..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleReply()
                    }
                  }}
                />
                <Button
                  size="icon"
                  onClick={handleReply}
                  disabled={sending || !replyMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {view === "chat" && activeTicket?.status === "closed" && (
            <div className="border-t p-3 text-center text-sm text-muted-foreground">
              Энэ хүсэлт хаагдсан байна
            </div>
          )}
      </div>
    </>
  )
}
