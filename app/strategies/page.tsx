"use client"

import { useState, useEffect } from "react"
import { Layers, Save, AlertCircle, ChevronDown, Check } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuthGuard } from "@/lib/auth-guard"
import type { StrategiesResponse, DetectorInfo } from "@/lib/types"

export default function StrategiesPage() {
  useAuthGuard(true)

  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [strategies, setStrategies] = useState<StrategiesResponse | null>(null)
  const [detectors, setDetectors] = useState<DetectorInfo[]>([])
  const [jsonEdit, setJsonEdit] = useState("")
  const [editMode, setEditMode] = useState(false)
  const [openDetectorDropdown, setOpenDetectorDropdown] = useState<number | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [strategiesData, detectorsData] = await Promise.all([
        api.strategies(),
        api.detectors().catch(() => ({ detectors: [] })),
      ])

      setStrategies(strategiesData)
      setJsonEdit(JSON.stringify(strategiesData.strategies, null, 2))
      setDetectors(detectorsData?.detectors || [])
    } catch (err: any) {
      console.error("[v0] Failed to load data:", err)
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
    // Validate: enabled strategies must have at least 1 detector
    if (!editMode && strategies?.strategies) {
      const invalid = strategies.strategies.find(
        (s) => s.enabled && (!s.detectors || s.detectors.length === 0)
      )
      if (invalid) {
        toast({
          title: "Анхааруулга",
          description: `"${invalid.name || invalid.strategy_id}" стратеги идэвхтэй боловч detector сонгоогүй байна.`,
          variant: "destructive",
        })
        return
      }
    }

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
      await loadData()
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

  const toggleDetector = (strategyIndex: number, detectorName: string) => {
    if (!strategies) return
    const newStrategies = [...strategies.strategies]
    const strategy = newStrategies[strategyIndex]
    const currentDetectors = strategy.detectors || []

    if (currentDetectors.includes(detectorName)) {
      strategy.detectors = currentDetectors.filter((d) => d !== detectorName)
    } else {
      strategy.detectors = [...currentDetectors, detectorName]
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
            Стратеги бүрт detector сонгоод идэвхжүүлнэ үү. Detector сонгоогүй стратеги ажиллахгүй.
          </AlertDescription>
        </Alert>

        {/* Detectors available info */}
        {detectors.length > 0 && (
          <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
            <p className="mb-2 text-sm font-medium">Боломжит Detectors ({detectors.length}):</p>
            <div className="flex flex-wrap gap-2">
              {detectors.map((d) => (
                <Badge key={d.name} variant="outline" className="text-xs">
                  {d.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Strategy Cards */}
        {!editMode && strategies?.strategies && (
          <div className="grid gap-4 md:grid-cols-2">
            {strategies.strategies.map((strategy, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      {strategy.name || strategy.strategy_id}
                    </CardTitle>
                    <Switch
                      checked={strategy.enabled}
                      onCheckedChange={() => toggleStrategyEnabled(idx)}
                    />
                  </div>
                  {strategy.description && (
                    <CardDescription>{strategy.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Detector selection */}
                  <div>
                    <p className="mb-2 text-sm font-medium">Detectors:</p>
                    <div className="relative">
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() =>
                          setOpenDetectorDropdown(
                            openDetectorDropdown === idx ? null : idx
                          )
                        }
                      >
                        <span className="truncate">
                          {strategy.detectors && strategy.detectors.length > 0
                            ? strategy.detectors.join(", ")
                            : "Detector сонгох..."}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>

                      {openDetectorDropdown === idx && (
                        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
                          {detectors.length === 0 ? (
                            <p className="p-2 text-sm text-muted-foreground">
                              Detector байхгүй
                            </p>
                          ) : (
                            detectors.map((detector) => {
                              const isSelected = strategy.detectors?.includes(
                                detector.name
                              )
                              return (
                                <div
                                  key={detector.name}
                                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                                  onClick={() => toggleDetector(idx, detector.name)}
                                >
                                  <div
                                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                                      isSelected
                                        ? "border-primary bg-primary"
                                        : "border-muted-foreground"
                                    }`}
                                  >
                                    {isSelected && (
                                      <Check className="h-3 w-3 text-primary-foreground" />
                                    )}
                                  </div>
                                  <span>{detector.name}</span>
                                </div>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>

                    {/* Selected detectors badges */}
                    {strategy.detectors && strategy.detectors.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {strategy.detectors.map((d) => (
                          <Badge
                            key={d}
                            variant="secondary"
                            className="cursor-pointer text-xs"
                            onClick={() => toggleDetector(idx, d)}
                          >
                            {d} ×
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Other params display */}
                  {strategy.min_rr !== undefined && (
                    <div className="text-sm text-muted-foreground">
                      Min RR: {strategy.min_rr}
                    </div>
                  )}
                  {strategy.min_score !== undefined && (
                    <div className="text-sm text-muted-foreground">
                      Min Score: {strategy.min_score}
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
