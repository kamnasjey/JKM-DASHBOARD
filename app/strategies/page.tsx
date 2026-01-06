"use client"

import { useState, useEffect } from "react"
import { Layers, Save, AlertCircle } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuthGuard } from "@/lib/auth-guard"
import type { StrategiesResponse } from "@/lib/types"

export default function StrategiesPage() {
  useAuthGuard(true)

  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [strategies, setStrategies] = useState<StrategiesResponse | null>(null)
  const [jsonEdit, setJsonEdit] = useState("")
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    loadStrategies()
  }, [])

  const loadStrategies = async () => {
    try {
      const data = await api.strategies()
      setStrategies(data)
      setJsonEdit(JSON.stringify(data.strategies, null, 2))
    } catch (err: any) {
      console.error("[v0] Failed to load strategies:", err)
      toast({
        title: "Алдаа",
        description: "Стратегиуд ачаалж чадсангүй",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      let dataToSave: any
      if (editMode) {
        dataToSave = { strategies: JSON.parse(jsonEdit) }
      } else {
        dataToSave = { strategies: strategies?.strategies }
      }

      await api.updateStrategies(dataToSave)
      toast({
        title: "Амжилттай",
        description: "Стратегиуд хадгалагдлаа",
      })
      await loadStrategies()
      setEditMode(false)
    } catch (err: any) {
      console.error("[v0] Failed to save strategies:", err)
      toast({
        title: "Алдаа",
        description: err.message || "Хадгалах үед алдаа гарлаа",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleStrategyEnabled = (index: number) => {
    if (!strategies) return
    const newStrategies = [...strategies.strategies]
    newStrategies[index] = {
      ...newStrategies[index],
      enabled: !newStrategies[index].enabled,
    }
    setStrategies({ ...strategies, strategies: newStrategies })
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Ачааллаж байна...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Strategies</h1>
            <p className="text-muted-foreground">Таны trading стратегиудын тохиргоо</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Хадгалж байна..." : "Хадгалах"}
          </Button>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Стратегиудаа сайн уншаад, тохируулга хийгээрэй. Advanced mode-д JSON засах боломжтой.
          </AlertDescription>
        </Alert>

        {/* Strategy Cards */}
        {!editMode && strategies?.strategies && (
          <div className="grid gap-4 md:grid-cols-2">
            {strategies.strategies.map((strategy, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      {strategy.name}
                    </CardTitle>
                    {strategy.enabled !== undefined && (
                      <Switch checked={strategy.enabled} onCheckedChange={() => toggleStrategyEnabled(idx)} />
                    )}
                  </div>
                  {strategy.description && <CardDescription>{strategy.description}</CardDescription>}
                </CardHeader>
                <CardContent>
                  {strategy.parameters && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Параметрүүд:</p>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <pre className="text-xs">{JSON.stringify(strategy.parameters, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* JSON Edit Mode */}
        {editMode && (
          <Card>
            <CardHeader>
              <CardTitle>JSON Editor</CardTitle>
              <CardDescription>Advanced: JSON форматаар стратегиудаа засах</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={jsonEdit}
                onChange={(e) => setJsonEdit(e.target.value)}
                className="font-mono text-xs"
                rows={20}
              />
            </CardContent>
          </Card>
        )}

        {/* Toggle Edit Mode */}
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setEditMode(!editMode)}>
            {editMode ? "Basic Mode" : "Advanced JSON Mode"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
