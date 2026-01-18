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
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuthGuard } from "@/lib/auth-guard"
import { normalizeDetectorList } from "@/lib/detector-utils"
import { DetectorSelect, validateSelection, ensureRequiredDetectors, getUnknownDetectors } from "@/components/detectors/detector-select"
import { CATEGORY_INFO, DETECTOR_BY_ID } from "@/lib/detectors/catalog"

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
  id?: string // Unique ID (optional for new strategies)
  strategy_id?: string // Keep for backward compat
  name: string
  enabled: boolean
  detectors: string[]
  min_score?: number
  min_rr?: number
  description?: string
  notes?: string // User notes for strategy
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
  notes: "",
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
      detectors: ensureRequiredDetectors([...strategy.detectors]),
      min_score: strategy.min_score || strategy.config?.min_score || 1.0,
      min_rr: strategy.min_rr || strategy.config?.min_rr || 2.0,
      description: strategy.description,
      notes: strategy.notes || "",
    })
    setEditingIndex(index)
    setShowCreateDialog(true)
  }

  const handleDetectorSelectionChange = (selected: string[]) => {
    setEditForm(prev => ({ ...prev, detectors: selected }))
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

    // Validate detector selection
    const validation = validateSelection(editForm.detectors)
    if (!validation.isValid) {
      toast({
        title: "Алдаа",
        description: validation.errors.join("; "),
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
              {strategies.map((strategy, idx) => {
                // Group detectors by category for display
                const detectorsByCategory = (strategy.detectors || []).reduce((acc, id) => {
                  const detector = DETECTOR_BY_ID.get(id)
                  const category = detector?.category || "unknown"
                  if (!acc[category]) acc[category] = []
                  acc[category].push({ id, label: detector?.labelShort || id, isUnknown: !detector })
                  return acc
                }, {} as Record<string, { id: string; label: string; isUnknown: boolean }[]>)

                const unknownCount = detectorsByCategory["unknown"]?.length || 0

                return (
                <Card key={strategy.strategy_id || idx} className={!strategy.enabled ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Layers className="h-4 w-4" />
                      {strategy.name || strategy.strategy_id}
                      {/* Starter badge for template strategies */}
                      {(strategy.id || strategy.strategy_id || "").startsWith("starter_") && (
                        <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                          ⭐ Starter
                        </Badge>
                      )}
                      {unknownCount > 0 && (
                        <Badge variant="outline" className="text-[10px] border-red-500/50 text-red-500">
                          ⚠ {unknownCount} unknown
                        </Badge>
                      )}
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
                {/* Detectors grouped by category */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Detectors ({strategy.detectors?.length || 0})
                  </p>
                  {(["gate", "trigger", "confluence"] as const).map(cat => {
                    const items = detectorsByCategory[cat]
                    if (!items?.length) return null
                    const info = CATEGORY_INFO[cat]
                    return (
                      <div key={cat} className="flex flex-wrap gap-1">
                        <span className="text-xs">{info.icon}</span>
                        {items.slice(0, 3).map((item, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {item.label}
                          </Badge>
                        ))}
                        {items.length > 3 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{items.length - 3}
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                  {/* Unknown detectors in red */}
                  {detectorsByCategory["unknown"]?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs">❓</span>
                      {detectorsByCategory["unknown"].slice(0, 3).map((item, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] border-red-500/50 text-red-500">
                          {item.id}
                        </Badge>
                      ))}
                      {detectorsByCategory["unknown"].length > 3 && (
                        <Badge variant="outline" className="text-[10px] border-red-500/50 text-red-500">
                          +{detectorsByCategory["unknown"].length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Params */}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Min RR: {strategy.min_rr || 2.0}</span>
                  <span>Min Score: {strategy.min_score || 1.0}</span>
                </div>

                {/* Notes preview */}
                {strategy.notes && (
                  <p className="text-xs text-muted-foreground italic line-clamp-1">
                    📝 {strategy.notes}
                  </p>
                )}

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
              )})}
            </div>

          {/* Create/Edit Dialog */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingIndex !== null ? "Стратеги засах" : "Шинэ Strategy үүсгэх"}
              </DialogTitle>
              <DialogDescription>
                Detector-уудыг сонгож combine хийнэ үү. Хамгийн багадаа 1 Gate + 1 Trigger сонгоно уу.
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

              {/* Notes - New field for user notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Тэмдэглэл (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Хувийн тэмдэглэл: Энэ стратегийг хэзээ хэрэглэх, ямар зах зээлд сайн ажилладаг гэх мэт..."
                  value={editForm.notes || ""}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={2}
                  className="resize-none"
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

              {/* Pro Detector Select Component */}
              <div className="space-y-2">
                <Label>Detectors *</Label>
                <DetectorSelect
                  selected={editForm.detectors}
                  onChange={handleDetectorSelectionChange}
                  maxHeight="350px"
                  onFixAndSave={editingIndex !== null ? async (normalizedDetectors) => {
                    // Auto-save after fixing when editing existing strategy
                    if (!editForm.strategy_id) return
                    try {
                      await api.strategiesV2.update(editForm.strategy_id, {
                        detectors: normalizedDetectors,
                      })
                      toast({
                        title: "Fixed & Saved",
                        description: "Detectors normalized and saved to strategy",
                      })
                      // Refresh strategy list
                      loadData()
                    } catch (err) {
                      toast({
                        title: "Save Failed",
                        description: "Could not save normalized detectors",
                        variant: "destructive",
                      })
                    }
                  } : undefined}
                />
              </div>
            </div>

            <DialogFooter>
              <div className="flex items-center justify-between w-full">
                <p className="text-xs text-muted-foreground">
                  Strategies: {strategies.length}/{MAX_STRATEGIES}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Болих
                  </Button>
                  <Button onClick={handleSaveStrategy} disabled={saving}>
                    {saving ? "Хадгалж байна..." : editingIndex !== null ? "Хадгалах" : "Үүсгэх"}
                  </Button>
                </div>
              </div>
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
