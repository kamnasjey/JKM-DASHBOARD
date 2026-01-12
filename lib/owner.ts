export function getOwnerEmails(): string[] {
  const raw = process.env.OWNER_ADMIN_EMAILS ?? process.env.OWNER_EMAIL ?? ""
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export function isOwnerEmail(email: unknown): boolean {
  if (!email || typeof email !== "string") return false
  const normalized = email.trim().toLowerCase()
  const owners = getOwnerEmails()
  return owners.length > 0 && owners.includes(normalized)
}
