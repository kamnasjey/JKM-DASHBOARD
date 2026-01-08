import Link from "next/link"
import { API_BASE_URL } from "@/lib/config"

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/50 py-12">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-4 text-xl font-bold">JKM Trading AI</div>
            <p className="text-sm text-muted-foreground">AI-тай хамт трейдинг сурч, тогтвортой ашигт хүрэх замнал.</p>
          </div>

          {/* Product */}
          <div>
            <div className="mb-4 text-sm font-semibold">Product</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="#features" className="hover:text-foreground transition-colors">
                  Онцлог
                </Link>
              </li>
              <li>
                <Link href="#journey" className="hover:text-foreground transition-colors">
                  Трейдэр замнал
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-foreground transition-colors">
                  Үнэ
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <div className="mb-4 text-sm font-semibold">Resources</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/auth/login" className="hover:text-foreground transition-colors">
                  Нэвтрэх
                </Link>
              </li>
              <li>
                <Link href="/auth/register" className="hover:text-foreground transition-colors">
                  Бүртгүүлэх
                </Link>
              </li>
              <li>
                <a
                  href={`${API_BASE_URL}/health`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  System Status
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <div className="mb-4 text-sm font-semibold">Contact</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>support@jkmtrading.ai</li>
              <li>Улаанбаатар, Монгол</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border/40 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} JKM Trading AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
