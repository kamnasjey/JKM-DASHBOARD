"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useAuthGuard } from "@/lib/auth-guard"
import { useI18n } from "@/lib/i18n"
import { Mail, Phone, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type AuthMethod = "select" | "phone" | "email"

export default function RegisterPage() {
  useAuthGuard(false)
  const { t } = useI18n()
  const { toast } = useToast()

  const [method, setMethod] = useState<AuthMethod>("select")
  const [loading, setLoading] = useState(false)
  const [phoneStep, setPhoneStep] = useState<"input" | "verify">("input")

  // Form states
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [phoneCode, setPhoneCode] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const handleGoogleRegister = () => {
    setLoading(true)
    signIn("google", { callbackUrl: "/dashboard" })
  }

  const handlePhoneSendCode = async () => {
    if (!phone || phone.length < 8) {
      toast({ title: t.error, description: "Утасны дугаараа оруулна уу", variant: "destructive" })
      return
    }
    setLoading(true)
    // TODO: Implement phone verification API
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setPhoneStep("verify")
    toast({ title: t.codeSent, description: phone })
    setLoading(false)
  }

  const handlePhoneVerify = async () => {
    if (!phoneCode || phoneCode.length < 4) {
      toast({ title: t.error, description: "Кодоо оруулна уу", variant: "destructive" })
      return
    }
    if (!name) {
      toast({ title: t.error, description: "Нэрээ оруулна уу", variant: "destructive" })
      return
    }
    setLoading(true)
    // TODO: Implement phone registration API
    await new Promise((resolve) => setTimeout(resolve, 1000))
    toast({ title: t.success })
    setLoading(false)
  }

  const handleEmailRegister = async () => {
    if (!name || !email || !password) {
      toast({ title: t.error, description: "Бүх талбарыг бөглөнө үү", variant: "destructive" })
      return
    }
    if (password !== confirmPassword) {
      toast({ title: t.error, description: "Нууц үг таарахгүй байна", variant: "destructive" })
      return
    }
    if (password.length < 6) {
      toast({ title: t.error, description: "Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой", variant: "destructive" })
      return
    }
    setLoading(true)
    // TODO: Implement email registration API
    await new Promise((resolve) => setTimeout(resolve, 1000))
    toast({ title: t.success })
    setLoading(false)
  }

  const renderMethodSelect = () => (
    <div className="space-y-4">
      {/* Google */}
      <Button type="button" className="w-full" size="lg" onClick={handleGoogleRegister} disabled={loading}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        {t.continueWithGoogle}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">{t.orContinueWith}</span>
        </div>
      </div>

      {/* Phone */}
      <Button
        type="button"
        variant="outline"
        className="w-full bg-transparent"
        size="lg"
        onClick={() => setMethod("phone")}
      >
        <Phone className="mr-2 h-4 w-4" />
        {t.continueWithPhone}
      </Button>

      {/* Email */}
      <Button
        type="button"
        variant="outline"
        className="w-full bg-transparent"
        size="lg"
        onClick={() => setMethod("email")}
      >
        <Mail className="mr-2 h-4 w-4" />
        {t.continueWithEmail}
      </Button>
    </div>
  )

  const renderPhoneAuth = () => (
    <div className="space-y-4">
      {phoneStep === "input" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="name">{t.name}</Label>
            <Input
              id="name"
              type="text"
              placeholder="Таны нэр"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t.phoneNumber}</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+976 9999 9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <Button className="w-full" size="lg" onClick={handlePhoneSendCode} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t.sendCode}
          </Button>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="code">{t.enterCode}</Label>
            <Input
              id="code"
              type="text"
              placeholder="123456"
              value={phoneCode}
              onChange={(e) => setPhoneCode(e.target.value)}
              maxLength={6}
            />
            <p className="text-xs text-muted-foreground">
              {t.codeSent}: {phone}
            </p>
          </div>
          <Button className="w-full" size="lg" onClick={handlePhoneVerify} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t.verifyCode}
          </Button>
        </>
      )}
      <Button
        variant="ghost"
        className="w-full"
        onClick={() => {
          setMethod("select")
          setPhoneStep("input")
        }}
      >
        {t.back}
      </Button>
    </div>
  )

  const renderEmailAuth = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t.name}</Label>
        <Input id="name" type="text" placeholder="Таны нэр" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t.email}</Label>
        <Input
          id="email"
          type="email"
          placeholder="example@mail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t.password}</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      <Button className="w-full" size="lg" onClick={handleEmailRegister} disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t.register}
      </Button>
      <Button variant="ghost" className="w-full" onClick={() => setMethod("select")}>
        {t.back}
      </Button>
    </div>
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-background/80 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t.createAccount}</CardTitle>
          <CardDescription>{t.registerDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {method === "select" && renderMethodSelect()}
          {method === "phone" && renderPhoneAuth()}
          {method === "email" && renderEmailAuth()}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <p className="text-center text-xs text-muted-foreground">{t.termsNotice}</p>
          <p className="text-center text-sm text-muted-foreground">
            {t.alreadyHaveAccount}{" "}
            <Link href="/login" className="text-primary hover:underline">
              {t.login}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
