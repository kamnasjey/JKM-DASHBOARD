"use client"

import { useState, useEffect } from "react"
import { Layers, Save, AlertCircle, Check, Plus, Trash2, Edit2, X, Sparkles, Info } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { StrategyMakerPanel } from "@/components/strategy-maker-panel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuthGuard } from "@/lib/auth-guard"
import { normalizeDetectorList } from "@/lib/detector-utils"

const MAX_STRATEGIES = 30

// Extended detector info with Cyrillic labels
interface DetectorInfo {
  id: string
  name?: string // backward compat
  labelMn: string
  descriptionMn: string
  category: "gate" | "trigger" | "confluence"
}

interface Strategy {
  id: string // Changed from strategy_id
  strategy_id?: string // Keep for backward compat
  name: string
  enabled: boolean
  detectors: string[]
  min_score?: number
  min_rr?: number
  description?: string
  config?: Record<string, any>
  createdAt?: string
  updatedAt?: string
}

const defaultStrategy: Omit<Strategy, 'strategy_id'> = {
  name: "",
  enabled: true,
  detectors: [],
  min_score: 1.0,
  min_rr: 2.0,
}

export default function StrategiesPage() {
  useAuthGuard(true)

  const { toast } = useToast()
  const [view, setView] = useState<"list" | "maker">("list")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [detectors, setDetectors] = useState<DetectorInfo[]>([])
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Omit<Strategy, 'strategy_id'> & { strategy_id?: string }>(defaultStrategy)
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null)

  // Debug: log editForm.detectors changes
  useEffect(() => {
    console.log("[strategies] editForm.detectors changed:", editForm.detectors)
  }, [editForm.detectors])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [strategiesData, detectorsData] = await Promise.all([
        // Use v2 Firestore-based API
        api.strategiesV2.list({ limit: 50 }).catch((err) => {
          console.error("[strategies] strategies load error:", err)
          return { ok: false, strategies: [] }
        }),
        api.detectors().catch((err) => {
          console.error("[strategies] detectors load error:", err)
          return { detectors: [] }
        }),
      ])

      console.log("[strategies] loaded strategies:", strategiesData?.strategies?.length || 0)
      console.log("[strategies] loaded detectors:", detectorsData?.detectors?.length || 0)
      
      // Map v2 format (id) to UI format (strategy_id for backward compat)
      const mappedStrategies = (strategiesData?.strategies || []).map((s: any) => ({
        ...s,
        strategy_id: s.id, // Backward compat
        min_score: s.config?.min_score ?? 1.0,
        min_rr: s.config?.min_rr ?? 2.0,
      }))
      
      setStrategies(mappedStrategies)
      
      // Map detectors to include 'name' for backward compat
      // Detectors from /api/detectors now have: id, labelMn, descriptionMn, category
      const mappedDetectors = (detectorsData?.detectors || []).map((d: any) => ({
        ...d,
        name: d.id, // backward compat - some UI uses 'name' instead of 'id'
      }))
      setDetectors(mappedDetectors)
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

  // Note: Individual save operations are now handled in handleSaveStrategy, 
  // toggleStrategyEnabled, and handleDeleteStrategy using v2 API

  const toggleStrategyEnabled = async (index: number) => {
    const strategy = strategies[index]
    const strategyId = strategy.id || strategy.strategy_id
    
    if (!strategyId) return
    
    const newEnabled = !strategy.enabled
    
    // Optimistic update
    const newStrategies = [...strategies]
    newStrategies[index] = { ...newStrategies[index], enabled: newEnabled }
    setStrategies(newStrategies)
    
    try {
      await api.strategiesV2.update(strategyId, { enabled: newEnabled })
    } catch (err: any) {
      // Revert on error
      newStrategies[index] = { ...newStrategies[index], enabled: !newEnabled }
      setStrategies([...newStrategies])
      toast({
        title: "Алдаа",
        description: "Төлөв өөрчлөх үед алдаа гарлаа",
        variant: "destructive",
      })
    }
  }

  const openCreateDialog = () => {
    if (strategies.length >= MAX_STRATEGIES) {
      toast({
        title: "Хязгаарлалт",
        description: `Хамгийн ихдээ ${MAX_STRATEGIES} стратеги үүсгэх боломжтой.`,
        variant: "destructive",
      })
      return
    }
    setEditForm({ ...defaultStrategy })
    setEditingIndex(null)
    setShowCreateDialog(true)
  }

  const openEditDialog = (index: number) => {
    const strategy = strategies[index]
    setEditForm({
      strategy_id: strategy.id || strategy.strategy_id, // Use id from v2 API
      name: strategy.name,
      enabled: strategy.enabled,
      detectors: [...strategy.detectors],
      min_score: strategy.min_score || strategy.config?.min_score || 1.0,
      min_rr: strategy.min_rr || strategy.config?.min_rr || 2.0,
      description: strategy.description,
    })
    setEditingIndex(index)
    setShowCreateDialog(true)
  }

  const handleFormDetectorToggle = (detectorId: string) => {
    setEditForm(prev => {
      const currentDetectors = Array.isArray(prev.detectors) ? prev.detectors : []
      console.log("[strategies] toggle detector:", detectorId, "current:", currentDetectors)
      
      let newDetectors: string[]
      if (currentDetectors.includes(detectorId)) {
        newDetectors = currentDetectors.filter(d => d !== detectorId)
      } else {
        newDetectors = [...currentDetectors, detectorId]
      }
      
      console.log("[strategies] new detectors:", newDetectors)
      return { ...prev, detectors: newDetectors }
    })
  }

  const handleSaveStrategy = async () => {
    if (!editForm.name.trim()) {
      toast({
        title: "Алдаа",
        description: "Стратегийн нэр оруулна уу",
        variant: "destructive",
      })
      return
    }

    if (editForm.detectors.length === 0) {
      toast({
        title: "Алдаа",
        description: "Хамгийн багадаа 1 detector сонгоно уу",
        variant: "destructive",
      })
      return
    }

    // Normalize detectors to canonical IDs before saving
    // This handles BREAKOUT_RETEST_ENTRY -> BREAK_RETEST etc.
    const normalizedDetectors = normalizeDetectorList(editForm.detectors)
    console.log("[strategies] normalized detectors:", normalizedDetectors)

    setSaving(true)
    try {
      if (editingIndex !== null && editForm.strategy_id) {
        // Update existing via v2 API
        const strategyId = editForm.strategy_id
        const result = await api.strategiesV2.update(strategyId, {
          name: editForm.name,
          enabled: editForm.enabled,
          detectors: normalizedDetectors, // Use normalized
          description: editForm.description,
          config: {
            min_score: editForm.min_score,
            min_rr: editForm.min_rr,
          },
        })
        
        if (!result.ok) {
          throw new Error("Failed to update")
        }
        
        toast({
          title: "Амжилттай",
          description: "Стратеги шинэчлэгдлээ",
        })
      } else {
        // Create new via v2 API
        const result = await api.strategiesV2.create({
          name: editForm.name,
          enabled: editForm.enabled,
          detectors: normalizedDetectors, // Use normalized
          description: editForm.description,
          config: {
            min_score: editForm.min_score,
            min_rr: editForm.min_rr,
          },
        })
        
        if (!result.ok) {
          throw new Error("Failed to create")
        }
        
        toast({
          title: "Амжилттай",
          description: "Шинэ стратеги үүсгэлээ",
        })
      }
      
      await loadData()
      setShowCreateDialog(false)
      setEditingIndex(null)
    } catch (err: any) {
      console.error("[strategies] save error:", err)
      // Check for limit reached error
      if (err.message?.includes("LIMIT") || err.message?.includes("Maximum")) {
        toast({
          title: "Хязгаарлалт",
          description: `Хамгийн ихдээ ${MAX_STRATEGIES} стратеги үүсгэх боломжтой.`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Алдаа",
          description: err.message || "Хадгалах үед алдаа гарлаа",
          variant: "destructive",
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteStrategy = async (index: number) => {
    const strategy = strategies[index]
    const strategyId = strategy.id || strategy.strategy_id
    
    if (!strategyId) {
      toast({
        title: "Алдаа",
        description: "Strategy ID олдсонгүй",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const result = await api.strategiesV2.delete(strategyId)
      
      if (!result.ok) {
        throw new Error("Failed to delete")
      }
      
      toast({
        title: "Амжилттай",
        description: "Стратеги устгагдлаа",
      })
      
      await loadData()
      setDeleteConfirmIndex(null)
    } catch (err: any) {
      console.error("[strategies] delete error:", err)
      toast({
        title: "Алдаа",
        description: err.message || "Устгах үед алдаа гарлаа",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
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
            <p className="text-muted-foreground">
              Таны trading стратегиуд ({strategies.length}/{MAX_STRATEGIES})
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={view === "maker" ? "default" : "outline"}
              onClick={() => setView((v) => (v === "maker" ? "list" : "maker"))}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {view === "maker" ? "Жагсаалт" : "Strategy Maker"}
            </Button>
            <Button onClick={openCreateDialog} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Шинэ Strategy
            </Button>
            <Button onClick={() => loadData()} disabled={loading} variant="outline">
              {loading ? "Ачаалж байна..." : "Шинэчлэх"}
            </Button>
          </div>
        </div>

        {view === "maker" ? (
          <StrategyMakerPanel
            embedded
            onCancel={() => setView("list")}
            onSaved={async () => {
              await loadData()
              setView("list")
            }}
          />
        ) : (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Detector-уудыг combine хийж өөрийн strategy үүсгэнэ үү. Хамгийн ихдээ {MAX_STRATEGIES} стратеги үүсгэх боломжтой.
              </AlertDescription>
            </Alert>

            {/* Empty state */}
            {strategies.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Layers className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Стратеги байхгүй</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Detector-уудыг combine хийж өөрийн strategy үүсгэнэ үү
                  </p>
                  <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Эхний Strategy үүсгэх
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Strategy Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {strategies.map((strategy, idx) => (
                <Card key={strategy.strategy_id || idx} className={!strategy.enabled ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Layers className="h-4 w-4" />
                      {strategy.name || strategy.strategy_id}
                    </CardTitle>
                    {strategy.description && (
                      <CardDescription className="mt-1">{strategy.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={strategy.enabled}
                      onCheckedChange={() => toggleStrategyEnabled(idx)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Detectors */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Detectors ({strategy.detectors?.length || 0})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {strategy.detectors?.slice(0, 6).map((d) => (
                      <Badge key={d} variant="secondary" className="text-xs">
                        {d}
                      </Badge>
                    ))}
                    {strategy.detectors?.length > 6 && (
                      <Badge variant="outline" className="text-xs">
                        +{strategy.detectors.length - 6} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Params */}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Min RR: {strategy.min_rr || 2.0}</span>
                  <span>Min Score: {strategy.min_score || 1.0}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEditDialog(idx)}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Засах
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirmIndex(idx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
                </Card>
              ))}
            </div>

          {/* Create/Edit Dialog */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingIndex !== null ? "Стратеги засах" : "Шинэ Strategy үүсгэх"}
              </DialogTitle>
              <DialogDescription>
                Detector-уудыг сонгож combine хийнэ үү
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Стратегийн нэр *</Label>
                <Input
                  id="name"
                  placeholder="Жишээ: My Trend Strategy"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Тайлбар (optional)</Label>
                <Input
                  id="description"
                  placeholder="Энэ стратегийн тухай товч тайлбар"
                  value={editForm.description || ""}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>

              {/* Enabled */}
              <div className="flex items-center justify-between">
                <Label>Идэвхтэй</Label>
                <Switch
                  checked={editForm.enabled}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, enabled: checked })}
                />
              </div>

              {/* Min RR */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Minimum Risk/Reward</Label>
                  <span className="text-sm font-medium">{editForm.min_rr?.toFixed(1)}</span>
                </div>
                <Slider
                  value={[editForm.min_rr || 2.0]}
                  onValueChange={([value]) => setEditForm({ ...editForm, min_rr: value })}
                  min={1}
                  max={5}
                  step={0.5}
                />
              </div>

              {/* Min Score */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Minimum Score</Label>
                  <span className="text-sm font-medium">{editForm.min_score?.toFixed(1)}</span>
                </div>
                <Slider
                  value={[editForm.min_score || 1.0]}
                  onValueChange={([value]) => setEditForm({ ...editForm, min_score: value })}
                  min={0.5}
                  max={3}
                  step={0.1}
                />
              </div>

              {/* Detectors */}
              <div className="space-y-3">
                <Label>
                  Detectors * ({editForm.detectors.length} сонгосон)
                </Label>
                
                {/* Group by category */}
                {(["gate", "trigger", "confluence"] as const).map((category) => {
                  const categoryDetectors = detectors.filter(d => d.category === category)
                  if (categoryDetectors.length === 0) return null
                  
                  const categoryLabels = {
                    gate: "🚪 Gate (Шүүлтүүр)",
                    trigger: "🎯 Trigger (Entry сигнал)",
                    confluence: "✅ Confluence (Баталгаа)"
                  }
                  
                  return (
                    <div key={category} className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {categoryLabels[category]}
                      </div>
                      <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                        <div className="grid grid-cols-1 gap-2">
                          {categoryDetectors.map((detector) => {
                            const detectorId = detector.id || detector.name
                            const isSelected = editForm.detectors.includes(detectorId)
                            return (
                              <TooltipProvider key={detectorId}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${
                                        isSelected 
                                          ? 'bg-primary/20 border border-primary' 
                                          : 'hover:bg-muted border border-transparent'
                                      }`}
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        handleFormDetectorToggle(detectorId)
                                      }}
                                    >
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => {}}
                                        className="mt-0.5"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium">
                                          {detector.labelMn || detectorId}
                                        </div>
                                        {detector.descriptionMn && (
                                          <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                            {detector.descriptionMn}
                                          </div>
                                        )}
                                      </div>
                                      {detector.descriptionMn && (
                                        <Info className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-1" />
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  {detector.descriptionMn && (
                                    <TooltipContent side="right" className="max-w-xs">
                                      <p className="text-sm">{detector.descriptionMn}</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
                
                {/* Selected detectors */}
                {editForm.detectors.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2 border-t">
                    <span className="text-xs text-muted-foreground mr-2">Сонгосон:</span>
                    {editForm.detectors.map((d) => {
                      // Find detector info to show Cyrillic label if available
                      const detectorInfo = detectors.find(det => det.id === d || det.name === d)
                      const displayLabel = detectorInfo?.labelMn?.split('(')[0]?.trim() || d
                      return (
                        <Badge
                          key={d}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => handleFormDetectorToggle(d)}
                        >
                          {displayLabel} <X className="h-3 w-3 ml-1" />
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Болих
              </Button>
              <Button onClick={handleSaveStrategy} disabled={saving}>
                {saving ? "Хадгалж байна..." : editingIndex !== null ? "Хадгалах" : "Үүсгэх"}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteConfirmIndex !== null} onOpenChange={() => setDeleteConfirmIndex(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Стратеги устгах</DialogTitle>
              <DialogDescription>
                &quot;{deleteConfirmIndex !== null ? strategies[deleteConfirmIndex]?.name : ""}&quot; стратегийг устгахдаа итгэлтэй байна уу?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmIndex(null)}>
                Болих
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirmIndex !== null && handleDeleteStrategy(deleteConfirmIndex)}
                disabled={saving}
              >
                {saving ? "Устгаж байна..." : "Устгах"}
              </Button>
            </DialogFooter>
          </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
