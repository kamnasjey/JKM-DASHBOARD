"use client"

import Link from "next/link"
import { CheckCircle, Clock, ArrowRight, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">JKM Copilot</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-lg">
        <div className="text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>

          <h1 className="text-3xl font-bold mb-4">Хүсэлт илгээгдлээ!</h1>

          <p className="text-muted-foreground mb-8">
            Таны төлбөрийн хүсэлт амжилттай илгээгдлээ.
            Бид шалгаад 24 цагийн дотор таны эрхийг нээх болно.
          </p>

          {/* Status Card */}
          <div className="bg-card border rounded-xl p-6 mb-8 text-left">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Шалгагдаж байна</h3>
                <p className="text-sm text-muted-foreground">
                  Таны төлбөр шалгагдаж байна. Эрх нээгдэхэд танд email-ээр мэдэгдэнэ.
                  Хэрэв 24 цагийн дотор хариу ирээгүй бол манай Facebook хуудсаар холбогдоорой.
                </p>
              </div>
            </div>
          </div>

          {/* What's Next */}
          <div className="bg-muted/50 rounded-xl p-6 mb-8 text-left">
            <h3 className="font-semibold mb-4">Дараа нь юу болох вэ?</h3>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0">1</span>
                <span>Бид таны гүйлгээг шалгана</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0">2</span>
                <span>Төлбөр баталгаажвал таны эрхийг нээнэ</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0">3</span>
                <span>Dashboard, Scanner, Simulator бүгдийг ашиглах боломжтой болно</span>
              </li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link href="/dashboard" className="block">
              <Button className="w-full" size="lg">
                Dashboard руу очих
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>

            <Link href="/" className="block">
              <Button variant="outline" className="w-full">
                Нүүр хуудас
              </Button>
            </Link>
          </div>

          {/* Support Link */}
          <p className="mt-8 text-sm text-muted-foreground">
            Асуулт байна уу?{" "}
            <a
              href="https://www.facebook.com/profile.php?id=61575073653581"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Facebook-ээр холбогдох
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
