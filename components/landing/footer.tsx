import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/95">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-2 text-xl font-bold">JKMCOPILOT</div>
            <p className="mb-3 text-sm text-muted-foreground">Just Keep Moving — 24/7 Setup Scanner 🔄</p>
            <p className="text-sm text-muted-foreground">
              Сигнал зардаг бот биш. Таны дүрмээр 24/7 скан хийж, setup олдвол илрүүлээд яагаад гэдгийг тайлбарлана.
            </p>
          </div>

          {/* Product */}
          <div>
            <div className="mb-4 text-sm font-semibold">Product</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="#features" className="transition-colors hover:text-foreground">
                  Онцлог
                </Link>
              </li>
              <li>
                <Link href="#journey" className="transition-colors hover:text-foreground">
                  Трейдэр замнал
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="transition-colors hover:text-foreground">
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
                <Link href="/auth/login" className="transition-colors hover:text-foreground">
                  Нэвтрэх
                </Link>
              </li>
              <li>
                <a
                  href="/api/proxy/health"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-foreground"
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
          <p>&copy; {new Date().getFullYear()} JKMCOPILOT. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
