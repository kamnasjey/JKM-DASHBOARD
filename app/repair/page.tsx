import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { isOwnerEmail } from "@/lib/owner"
import RepairClient from "./repair-client"

export const runtime = "nodejs"

export default async function RepairPage() {
  const session = await getServerSession(authOptions)
  const email = (session?.user as any)?.email
  const isOwner = isOwnerEmail(email)

  if (!session?.user) {
    // middleware should usually handle this, but keep it safe
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">Засварын газар</h1>
        <p className="mt-2 text-sm text-muted-foreground">Нэвтэрсний дараа ашиглана.</p>
      </div>
    )
  }

  if (!isOwner) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">Засварын газар</h1>
        <p className="mt-2 text-sm text-muted-foreground">Owner/Admin зөвшөөрөл шаардлагатай.</p>
      </div>
    )
  }

  return <RepairClient userEmail={String(email || "")} />
}
