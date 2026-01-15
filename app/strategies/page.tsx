"use client"

import { useState, useEffect } from "react"
import { Layers, Save, AlertCircle, Check, Plus, Trash2, Edit2, X, Sparkles } from "lucide-react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
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
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuthGuard } from "@/lib/auth-guard"
import type { DetectorInfo } from "@/lib/types"

const MAX_STRATEGIES = 30

interface Strategy {
  strategy_id: string
  name: string
  enabled: boolean
  detectors: string[]
  min_score?: number
  min_rr?: number
  description?: string
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
        api.strategies().catch((err) => {
          console.error("[strategies] strategies load error:", err)
          return { strategies: [] }
        }),
        api.detectors().catch((err) => {
          console.error("[strategies] detectors load error:", err)
          return { detectors: [] }
        }),
      ])

      console.log("[strategies] loaded strategies:", strategiesData?.strategies?.length || 0)
      console.log("[strategies] loaded detectors:", detectorsData?.detectors?.length || 0)
      setStrategies(strategiesData?.strategies || [])
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

  const handleSave = async (newStrategies?: Strategy[]) => {
    const toSave = newStrategies || strategies
    
    // Validate: enabled strategies must have at least 1 detector
    const invalid = toSave.find(
      (s) => s.enabled && (!s.detectors || s.detectors.length === 0)
    )
    if (invalid) {
      toast({
        title: "Анхааруулга",
        description: `"${invalid.name || invalid.strategy_id}" стратеги идэвхтэй боловч detector сонгоогүй байна.`,
        variant: "destructive",
      })
      return false
    }

    setSaving(true)
    try {
      const result = await api.updateStrategies({ strategies: toSave })
      
      if (!result.ok) {
        throw new Error(result.error || "Failed to save")
      }
      
      toast({
        title: "Амжилттай",
        description: "Стратегиуд хадгалагдлаа",
      })
      await loadData()
      return true
    } catch (err: any) {
      console.error("[v0] Failed to save strategies:", err)
      toast({
        title: "Алдаа",
        description: err.message || "Хадгалах үед алдаа гарлаа",
        variant: "destructive",
      })
      return false
    } finally {
      setSaving(false)
    }
  }

  const toggleStrategyEnabled = async (index: number) => {
    const newStrategies = [...strategies]
    newStrategies[index] = {
      ...newStrategies[index],
      enabled: !newStrategies[index].enabled,
    }
    setStrategies(newStrategies)
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
      strategy_id: strategy.strategy_id,
      name: strategy.name,
      enabled: strategy.enabled,
      detectors: [...strategy.detectors],
      min_score: strategy.min_score || 1.0,
      min_rr: strategy.min_rr || 2.0,
      description: strategy.description,
    })
    setEditingIndex(index)
    setShowCreateDialog(true)
  }

  const handleFormDetectorToggle = (detectorName: string) => {
    setEditForm(prev => {
      const currentDetectors = Array.isArray(prev.detectors) ? prev.detectors : []
      console.log("[strategies] toggle detector:", detectorName, "current:", currentDetectors)
      
      let newDetectors: string[]
      if (currentDetectors.includes(detectorName)) {
        newDetectors = currentDetectors.filter(d => d !== detectorName)
      } else {
        newDetectors = [...currentDetectors, detectorName]
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

    let newStrategies: Strategy[]
    
    if (editingIndex !== null) {
      // Update existing
      newStrategies = [...strategies]
      newStrategies[editingIndex] = {
        strategy_id: editForm.strategy_id || strategies[editingIndex].strategy_id,
        name: editForm.name,
        enabled: editForm.enabled,
        detectors: editForm.detectors,
        min_score: editForm.min_score,
        min_rr: editForm.min_rr,
        description: editForm.description,
      }
    } else {
      // Create new
      const strategyId = editForm.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now().toString(36)
      newStrategies = [...strategies, {
        strategy_id: strategyId,
        name: editForm.name,
        enabled: editForm.enabled,
        detectors: editForm.detectors,
        min_score: editForm.min_score,
        min_rr: editForm.min_rr,
        description: editForm.description,
      }]
    }

    const success = await handleSave(newStrategies)
    if (success) {
      setShowCreateDialog(false)
      setEditingIndex(null)
    }
  }

  const handleDeleteStrategy = async (index: number) => {
    const newStrategies = strategies.filter((_, i) => i !== index)
    const success = await handleSave(newStrategies)
    if (success) {
      setDeleteConfirmIndex(null)
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
            <Button asChild variant="outline">
              <Link href="/strategies/maker">
                <Sparkles className="mr-2 h-4 w-4" />
                Strategy Maker
              </Link>
            </Button>
            <Button onClick={openCreateDialog} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Шинэ Strategy
            </Button>
            <Button onClick={() => handleSave()} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Хадгалж байна..." : "Хадгалах"}
            </Button>
          </div>
        </div>

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
                <div className="border rounded-lg p-3 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    {detectors.map((detector) => {
                      const isSelected = editForm.detectors.includes(detector.name)
                      return (
                        <div
                          key={detector.name}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer ${isSelected ? 'bg-primary/20 border border-primary' : 'hover:bg-muted'}`}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleFormDetectorToggle(detector.name)
                          }}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => {}}
                          />
                          <span className="text-sm flex-1">
                            {detector.name}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                {/* Selected detectors */}
                {editForm.detectors.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {editForm.detectors.map((d) => (
                      <Badge
                        key={d}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleFormDetectorToggle(d)}
                      >
                        {d} <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
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
      </div>
    </DashboardLayout>
  )
}
