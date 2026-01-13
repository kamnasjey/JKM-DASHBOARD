/**
 * Access control for the dashboard.
 * Only users listed in ALLOWED_EMAILS env variable can access.
 * Owner emails always have access.
 */

import { getOwnerEmails } from "./owner"

export function getAllowedEmails(): string[] {
  const raw = process.env.ALLOWED_EMAILS ?? ""
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export function isAllowedEmail(email: unknown): boolean {
  if (!email || typeof email !== "string") return false
  const normalized = email.trim().toLowerCase()
  
  // Owner emails always have access
  const owners = getOwnerEmails()
  if (owners.includes(normalized)) return true
  
  // Check allowed emails list
  const allowed = getAllowedEmails()
  return allowed.includes(normalized)
}
