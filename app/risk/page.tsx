"use client"

import { useState, useEffect } from "react"
import { Shield, AlertTriangle, Info } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getRiskSettings, setRiskSettings } from "@/lib/storage"
import { calculateExposure } from "@/lib/utils-trading"
import type { RiskSettings } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useAuthGuard } from "@/lib/auth-guard"

export default function RiskPage() {
  useAuthGuard(true)

  const { toast } = useToast()
  const [settings, setSettings] = useState<RiskSettings>({
    riskPerTrade: 1,
    maxDailyLoss: 3,
    maxOpenPositions: 3,
    preferredRRMin: 2.7,
  })

  useEffect(() => {
    const stored = getRiskSettings()
    if (stored) {
      setSettings(stored)
    }
  }, [])

  const handleSave = () => {
    setRiskSettings(settings)
    toast({
      title: "Амжилттай",
      description: "Risk тохиргоо хадгалагдлаа",
    })
  }

  const exposure = calculateExposure(settings.riskPerTrade, settings.maxOpenPositions)
  const exposureWarning = exposure > 5

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Risk Management</h1>
          <p className="text-muted-foreground">Таны account-г хамгаалах тохиргоо</p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Risk management бол trading-ийн хамгийн чухал хэсэг. Энэ тохиргоог зөв тохируулж, үргэлж дагаарай.
          </AlertDescription>
        </Alert>

        {/* Risk Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Risk тохиргоо
            </CardTitle>
            <CardDescription>Account-нийхаа хэдэн хувийг risk хийхээ тодорхойлох</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="riskPerTrade">Risk per trade (%)</Label>
                <Input
                  id="riskPerTrade"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="5"
                  value={settings.riskPerTrade}
                  onChange={(e) => setSettings({ ...settings, riskPerTrade: Number.parseFloat(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Санал: 1-2% (Beginner-д 1%)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxDailyLoss">Max daily loss (%)</Label>
                <Input
                  id="maxDailyLoss"
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={settings.maxDailyLoss}
                  onChange={(e) => setSettings({ ...settings, maxDailyLoss: Number.parseFloat(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Өдөрт хамгийн ихдээ алдах боломжтой хувь</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxOpenPositions">Max open positions</Label>
                <Input
                  id="maxOpenPositions"
                  type="number"
                  min="1"
                  max="10"
                  value={settings.maxOpenPositions}
                  onChange={(e) => setSettings({ ...settings, maxOpenPositions: Number.parseInt(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Нэг дор хамгийн ихдээ хэдэн position</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferredRRMin">Preferred RR Min</Label>
                <Input
                  id="preferredRRMin"
                  type="number"
                  step="0.5"
                  min="2.7"
                  max="5"
                  value={settings.preferredRRMin}
                  onChange={(e) => setSettings({ ...settings, preferredRRMin: Number.parseFloat(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Таны хүлээн зөвшөөрөх хамгийн бага RR</p>
              </div>
            </div>

            <Button onClick={handleSave} className="w-full">
              Хадгалах
            </Button>
          </CardContent>
        </Card>

        {/* Risk Meter */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Exposure Meter</CardTitle>
            <CardDescription>Таны одоогийн risk exposure-г харуулна</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Нийт Exposure</span>
                <span className="text-2xl font-bold">{exposure.toFixed(1)}%</span>
              </div>
              <Progress value={(exposure / 10) * 100} className="h-3" />
            </div>

            {exposureWarning && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Анхаар! Таны exposure {exposure.toFixed(1)}% байна. 5%-с их байх нь эрсдэлтэй.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2 rounded-lg bg-muted/50 p-4 text-sm">
              <p>
                <strong>Тооцоолол:</strong>
              </p>
              <p>
                Risk per trade: {settings.riskPerTrade}% × {settings.maxOpenPositions} positions = {exposure.toFixed(1)}
                % exposure
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Discipline Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Discipline зөвлөмж</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>1% дүрэм яагаад чухал вэ?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    1% risk per trade гэдэг нь таны account-г удаан хугацаанд амьд байлгах гол арга. 10 дараалсан
                    алдагдал гарсан ч та account-нийхаа 10% л алдана. Энэ нь танд сэргэх боломж өгнө.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>Stop Loss хэрхэн тохируулах вэ?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    Stop Loss нь таны risk-г тодорхойлно. Account size болон risk %-аас хамаарч position size-аа
                    тооцоолоорой. Зөвхөн technical хэсгээр биш, risk management-р position size тодорхойлох ёстой.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>RR ratio хэрхэн ашиглах вэ?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    2:1 RR гэдэг нь та 1$ risk хийхэд 2$ олох боломжтой гэсэн үг. 50% winrate-тай ч ашигтай байна. 40%
                    winrate-тай ч 3:1 RR-тай бол та ашигтай. Math чухал!
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>Хэзээ trade хийхгүй байх вэ?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    Max daily loss хүрсэн бол зогсоорой. Эмоционал байх үедээ trade бүү хий. Setup таны дүрэмд нийцэхгүй
                    бол алгасаарай. FOMO (Fear of Missing Out) нь таны хамгийн том дайсан.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
