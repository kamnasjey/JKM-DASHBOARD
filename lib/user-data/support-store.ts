/**
 * Support Tickets Store - Firestore
 *
 * Collection: support_tickets
 * Document structure:
 * {
 *   id: string,
 *   userId: string,
 *   userEmail: string,
 *   userName: string | null,
 *   status: "open" | "replied" | "closed",
 *   subject: string,
 *   messages: Message[],
 *   createdAt: string (ISO),
 *   updatedAt: string (ISO),
 * }
 */

import { getFirebaseAdminDb } from "@/lib/firebase-admin"

const COLLECTION = "support_tickets"

export type SupportMessage = {
  id: string
  sender: "user" | "admin"
  senderName: string
  content: string
  createdAt: string
}

export type SupportTicket = {
  id: string
  userId: string
  userEmail: string
  userName: string | null
  status: "open" | "replied" | "closed"
  subject: string
  messages: SupportMessage[]
  createdAt: string
  updatedAt: string
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function createTicket(
  userId: string,
  userEmail: string,
  userName: string | null,
  subject: string,
  message: string
): Promise<SupportTicket> {
  const db = getFirebaseAdminDb()
  const ticketId = generateId()
  const now = new Date().toISOString()

  const ticket: SupportTicket = {
    id: ticketId,
    userId,
    userEmail,
    userName,
    status: "open",
    subject,
    messages: [
      {
        id: generateId(),
        sender: "user",
        senderName: userName || userEmail,
        content: message,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  }

  await db.collection(COLLECTION).doc(ticketId).set(ticket)
  return ticket
}

export async function addMessage(
  ticketId: string,
  sender: "user" | "admin",
  senderName: string,
  content: string
): Promise<SupportTicket | null> {
  const db = getFirebaseAdminDb()
  const ref = db.collection(COLLECTION).doc(ticketId)
  const snap = await ref.get()

  if (!snap.exists) {
    return null
  }

  const ticket = snap.data() as SupportTicket
  const now = new Date().toISOString()

  const newMessage: SupportMessage = {
    id: generateId(),
    sender,
    senderName,
    content,
    createdAt: now,
  }

  ticket.messages.push(newMessage)
  ticket.updatedAt = now
  ticket.status = sender === "admin" ? "replied" : "open"

  await ref.update({
    messages: ticket.messages,
    updatedAt: now,
    status: ticket.status,
  })

  return ticket
}

export async function getTicket(ticketId: string): Promise<SupportTicket | null> {
  const db = getFirebaseAdminDb()
  const ref = db.collection(COLLECTION).doc(ticketId)
  const snap = await ref.get()

  if (!snap.exists) {
    return null
  }

  return snap.data() as SupportTicket
}

export async function getTicketsForUser(userId: string): Promise<SupportTicket[]> {
  const db = getFirebaseAdminDb()
  const snap = await db
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .orderBy("updatedAt", "desc")
    .limit(50)
    .get()

  return snap.docs.map((doc) => doc.data() as SupportTicket)
}

export async function getAllTickets(
  status?: "open" | "replied" | "closed",
  limit: number = 100
): Promise<SupportTicket[]> {
  const db = getFirebaseAdminDb()
  let query = db.collection(COLLECTION).orderBy("updatedAt", "desc")

  if (status) {
    query = query.where("status", "==", status)
  }

  const snap = await query.limit(limit).get()
  return snap.docs.map((doc) => doc.data() as SupportTicket)
}

export async function updateTicketStatus(
  ticketId: string,
  status: "open" | "replied" | "closed"
): Promise<void> {
  const db = getFirebaseAdminDb()
  const ref = db.collection(COLLECTION).doc(ticketId)

  await ref.update({
    status,
    updatedAt: new Date().toISOString(),
  })
}

export async function getOpenTicketsCount(): Promise<number> {
  const db = getFirebaseAdminDb()
  const snap = await db
    .collection(COLLECTION)
    .where("status", "==", "open")
    .count()
    .get()

  return snap.data().count
}
