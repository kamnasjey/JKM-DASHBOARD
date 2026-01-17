"use client"

import { useState, useMemo, useCallback } from "react"
import { Search, X, Lock, Check, AlertTriangle, Sparkles, Info, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DETECTOR_CATALOG,
  DETECTORS_BY_CATEGORY,
  DETECTOR_COUNTS,
  DETECTOR_PRESETS,
  CATEGORY_INFO,
  IMPACT_BADGES,
  COST_BADGES,
  DETECTOR_BY_ID,
  validateSelection,
  ensureRequiredDetectors,
  searchDetectors,
  type DetectorMeta,
  type DetectorCategory,
  type DetectorPreset,
} from "@/lib/detectors/catalog"
import { normalizeDetectorList } from "@/lib/detectors/normalize"

import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

// ============================================================
// Types
// ============================================================

interface DetectorSelectProps {
  /** Currently selected detector IDs */
  selected: string[]
  /** Callback when selection changes */
  onChange: (selected: string[]) => void
  /** Show compact mode (less padding) */
  compact?: boolean
  /** Max height for the component */
  maxHeight?: string
  /** Disable all interactions */
  disabled?: boolean
  /** Optional callback for "Fix & Save" (when editing existing strategy) */
  onFixAndSave?: (normalized: string[]) => void
}

// ============================================================
// Subcomponents
// ============================================================

function DetectorItem({
  detector,
  isSelected,
  isRequired,
  onToggle,
  disabled,
}: {
  detector: DetectorMeta
  isSelected: boolean
  isRequired: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  const categoryInfo = CATEGORY_INFO[detector.category]
  const impactBadge = IMPACT_BADGES[detector.impact]
  const costBadge = COST_BADGES[detector.cost]

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer",
        isSelected
          ? "bg-primary/5 border-primary/30"
          : "bg-card/50 border-border/50 hover:border-border hover:bg-muted/30",
        disabled && "opacity-50 cursor-not-allowed",
        isRequired && isSelected && "border-yellow-500/30 bg-yellow-500/5"
      )}
      onClick={() => !disabled && !isRequired && onToggle()}
    >
      {/* Checkbox */}
      <div className="pt-0.5">
        {isRequired ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-4 h-4 flex items-center justify-center">
                  <Lock className="w-3.5 h-3.5 text-yellow-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Заавал сонгосон байх ёстой</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggle()}
            disabled={disabled}
            className="mt-0.5"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{detector.labelEn}</span>
          {isRequired && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-500/30 text-yellow-500">
              Required
            </Badge>
          )}
        </div>
        {detector.labelMn && detector.labelMn !== detector.labelEn && (
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            {detector.labelMn}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {detector.descEn}
        </p>
      </div>

      {/* Badges */}
      <div className="flex flex-col gap-1 items-end shrink-0">
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", impactBadge.className)}>
          {impactBadge.label}
        </Badge>
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", costBadge.className)}>
          {costBadge.label}
        </Badge>
      </div>
    </div>
  )
}

function CategorySection({
  category,
  detectors,
  selected,
  onToggle,
  disabled,
  searchQuery,
}: {
  category: DetectorCategory
  detectors: DetectorMeta[]
  selected: string[]
  onToggle: (id: string) => void
  disabled?: boolean
  searchQuery: string
}) {
  const info = CATEGORY_INFO[category]
  const selectedCount = detectors.filter(d => selected.includes(d.id)).length
  const totalCount = detectors.length
  
  // Filter by search
  const filteredDetectors = searchQuery
    ? detectors.filter(d =>
        d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.labelMn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.descriptionMn.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : detectors

  if (filteredDetectors.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">{info.icon}</span>
          <span className="text-sm font-medium">{info.labelMn}</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {selectedCount}/{totalCount}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground px-1 mb-2">
        {info.descriptionMn}
      </p>
      <div className="space-y-1.5">
        {filteredDetectors.map(detector => (
          <DetectorItem
            key={detector.id}
            detector={detector}
            isSelected={selected.includes(detector.id)}
            isRequired={detector.required || false}
            onToggle={() => onToggle(detector.id)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}

function PresetCard({
  preset,
  onApply,
  disabled,
}: {
  preset: DetectorPreset
  onApply: () => void
  disabled?: boolean
}) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:border-primary/50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={() => !disabled && onApply()}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <span className="text-xl">{preset.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{preset.nameEn}</div>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {preset.descEn}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {preset.detectors.slice(0, 3).map(id => (
                <Badge key={id} variant="secondary" className="text-[10px] px-1.5">
                  {id.replace(/_/g, " ")}
                </Badge>
              ))}
              {preset.detectors.length > 3 && (
                <Badge variant="outline" className="text-[10px] px-1.5">
                  +{preset.detectors.length - 3}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CountMeter({
  counts,
  totals,
}: {
  counts: { gates: number; triggers: number; confluence: number; total: number }
  totals: typeof DETECTOR_COUNTS
}) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-muted-foreground font-medium">Сонгосон:</span>
      <div className="flex items-center gap-2 bg-muted/50 px-2 py-1 rounded-md">
        <span className={cn("font-medium", counts.gates > 0 && "text-yellow-500")}>
          G:{counts.gates}
        </span>
        <span className="text-muted-foreground/50">/</span>
        <span className={cn("font-medium", counts.triggers > 0 && "text-green-500")}>
          T:{counts.triggers}
        </span>
        <span className="text-muted-foreground/50">/</span>
        <span className={cn("font-medium", counts.confluence > 0 && "text-blue-500")}>
          C:{counts.confluence}
        </span>
      </div>
      <span className="text-muted-foreground">
        = {counts.total}/{totals.total}
      </span>
    </div>
  )
}

/** Identify unknown/invalid detectors from selection */
function getUnknownDetectors(selected: string[]): string[] {
  return selected.filter(id => !DETECTOR_BY_ID.has(id.toUpperCase()))
}

/** Unknown detector warning component */
function UnknownDetectorWarning({
  unknownDetectors,
  onFix,
  onFixAndSave,
  disabled,
}: {
  unknownDetectors: string[]
  onFix: () => void
  onFixAndSave?: () => void
  disabled?: boolean
}) {
  if (unknownDetectors.length === 0) return null

  return (
    <Alert className="py-3 border-red-500/30 bg-red-500/5">
      <AlertTriangle className="h-4 w-4 text-red-500" />
      <AlertDescription className="text-xs space-y-2">
        <div className="font-medium text-red-600 dark:text-red-400">
          ⚠ Алдаа/хуучин стратеги илэрлээ
        </div>
        <p className="text-muted-foreground">
          Зарим detector нэр хуучин эсвэл буруу байна ({unknownDetectors.length}): {unknownDetectors.slice(0, 3).join(", ")}{unknownDetectors.length > 3 ? "..." : ""}
        </p>
        <p className="text-muted-foreground">
          "Fix (Normalize)" дарж автоматаар цэвэрлэнэ.
        </p>
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-red-500/30 hover:bg-red-500/10"
            onClick={onFix}
            disabled={disabled}
          >
            <Wrench className="h-3 w-3 mr-1" />
            Fix (Normalize)
          </Button>
          {onFixAndSave && (
            <Button
              variant="default"
              size="sm"
              className="h-7 text-xs bg-red-600 hover:bg-red-700"
              onClick={onFixAndSave}
              disabled={disabled}
            >
              <Wrench className="h-3 w-3 mr-1" />
              Fix & Save
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

// ============================================================
// Main Component
// ============================================================

export function DetectorSelect({
  selected,
  onChange,
  compact = false,
  maxHeight = "500px",
  disabled = false,
  onFixAndSave,
}: DetectorSelectProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"all" | DetectorCategory>("all")
  const [showPresets, setShowPresets] = useState(false)

  // Ensure required detectors are always in selection
  const normalizedSelected = useMemo(
    () => ensureRequiredDetectors(selected),
    [selected]
  )

  // Identify unknown detectors
  const unknownDetectors = useMemo(
    () => getUnknownDetectors(selected),
    [selected]
  )

  // Validation
  const validation = useMemo(
    () => validateSelection(normalizedSelected),
    [normalizedSelected]
  )

  // Toggle detector
  const handleToggle = useCallback((id: string) => {
    const detector = DETECTOR_CATALOG.find(d => d.id === id)
    if (detector?.required) return // Cannot toggle required detectors
    
    const newSelected = normalizedSelected.includes(id)
      ? normalizedSelected.filter(s => s !== id)
      : [...normalizedSelected, id]
    
    onChange(ensureRequiredDetectors(newSelected))
  }, [normalizedSelected, onChange])

  // Apply preset
  const handleApplyPreset = useCallback((preset: DetectorPreset) => {
    onChange(ensureRequiredDetectors(preset.detectors))
    setShowPresets(false)
  }, [onChange])

  // Clear all (except required)
  const handleClearAll = useCallback(() => {
    onChange(ensureRequiredDetectors([]))
  }, [onChange])

  // Fix (Normalize) - removes unknowns, normalizes IDs
  const handleFix = useCallback(() => {
    // Normalize and filter to valid catalog IDs only
    const normalized = normalizeDetectorList(selected)
    const validOnly = normalized.filter(id => DETECTOR_BY_ID.has(id))
    const fixed = ensureRequiredDetectors(validOnly)
    onChange(fixed)
  }, [selected, onChange])

  // Fix & Save - same as fix, then call callback
  const handleFixAndSave = useCallback(() => {
    const normalized = normalizeDetectorList(selected)
    const validOnly = normalized.filter(id => DETECTOR_BY_ID.has(id))
    const fixed = ensureRequiredDetectors(validOnly)
    onChange(fixed)
    onFixAndSave?.(fixed)
  }, [selected, onChange, onFixAndSave])

  // Filter detectors based on tab and search
  const filteredDetectors = useMemo(() => {
    let detectors = DETECTOR_CATALOG
    
    // Filter by search
    if (searchQuery) {
      detectors = searchDetectors(searchQuery)
    }
    
    // Filter by category tab
    if (activeTab !== "all") {
      detectors = detectors.filter(d => d.category === activeTab)
    }
    
    return detectors
  }, [searchQuery, activeTab])

  return (
    <div className="space-y-3">
      {/* Header: Search + Filters + Count */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Хайх... (нэр, тайлбар, tag)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
              disabled={disabled}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          <Button
            variant={showPresets ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowPresets(!showPresets)}
            disabled={disabled}
          >
            <Sparkles className="h-4 w-4 mr-1" />
            Presets
          </Button>
        </div>

        {/* Count Meter */}
        <CountMeter counts={validation.counts} totals={DETECTOR_COUNTS} />
      </div>

      {/* Presets (collapsible) */}
      <Collapsible open={showPresets} onOpenChange={setShowPresets}>
        <CollapsibleContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {DETECTOR_PRESETS.map(preset => (
              <PresetCard
                key={preset.id}
                preset={preset}
                onApply={() => handleApplyPreset(preset)}
                disabled={disabled}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Unknown Detector Warning */}
      <UnknownDetectorWarning
        unknownDetectors={unknownDetectors}
        onFix={handleFix}
        onFixAndSave={onFixAndSave ? handleFixAndSave : undefined}
        disabled={disabled}
      />

      {/* Validation Errors */}
      {validation.errors.length > 0 && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {validation.errors.map((err, i) => (
              <div key={i}>{err}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Warnings */}
      {validation.warnings.length > 0 && validation.errors.length === 0 && (
        <Alert className="py-2 border-yellow-500/30 bg-yellow-500/5">
          <Info className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-xs text-yellow-600 dark:text-yellow-400">
            {validation.warnings.map((warn, i) => (
              <div key={i}>{warn}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Category Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-4 h-9">
          <TabsTrigger value="all" className="text-xs">
            All ({filteredDetectors.length})
          </TabsTrigger>
          <TabsTrigger value="gate" className="text-xs">
            🚦 Gate
          </TabsTrigger>
          <TabsTrigger value="trigger" className="text-xs">
            🎯 Trigger
          </TabsTrigger>
          <TabsTrigger value="confluence" className="text-xs">
            🔗 Confirm
          </TabsTrigger>
        </TabsList>

        <div 
          className="mt-3 overflow-y-auto pr-1" 
          style={{ maxHeight }}
        >
          <TabsContent value="all" className="mt-0 space-y-4">
            {(["gate", "trigger", "confluence"] as const).map(category => (
              <CategorySection
                key={category}
                category={category}
                detectors={DETECTORS_BY_CATEGORY[category]}
                selected={normalizedSelected}
                onToggle={handleToggle}
                disabled={disabled}
                searchQuery={searchQuery}
              />
            ))}
          </TabsContent>

          {(["gate", "trigger", "confluence"] as const).map(category => (
            <TabsContent key={category} value={category} className="mt-0">
              <CategorySection
                category={category}
                detectors={DETECTORS_BY_CATEGORY[category]}
                selected={normalizedSelected}
                onToggle={handleToggle}
                disabled={disabled}
                searchQuery={searchQuery}
              />
            </TabsContent>
          ))}
        </div>
      </Tabs>

      {/* Selected Summary */}
      {(normalizedSelected.length > 0 || unknownDetectors.length > 0) && (
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Сонгосон ({normalizedSelected.length})
              </span>
              {unknownDetectors.length > 0 && (
                <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-500">
                  + {unknownDetectors.length} unknown
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={handleClearAll}
              disabled={disabled}
            >
              Цэвэрлэх
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {/* Valid detectors */}
            {normalizedSelected.map(id => {
              const detector = DETECTOR_CATALOG.find(d => d.id === id)
              if (!detector) return null
              const info = CATEGORY_INFO[detector.category]
              return (
                <Badge
                  key={id}
                  variant="secondary"
                  className={cn(
                    "text-xs cursor-pointer hover:bg-destructive/20",
                    detector.required && "cursor-not-allowed"
                  )}
                  onClick={() => !detector.required && handleToggle(id)}
                >
                  <span className="mr-1">{info.icon}</span>
                  {detector.labelShort}
                  {!detector.required && <X className="h-3 w-3 ml-1" />}
                  {detector.required && <Lock className="h-3 w-3 ml-1 text-yellow-500" />}
                </Badge>
              )
            })}
            {/* Unknown detectors in red */}
            {unknownDetectors.map(id => (
              <Badge
                key={id}
                variant="outline"
                className="text-xs border-red-500/50 bg-red-500/10 text-red-500"
              >
                ❓ {id}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Export validation for external use
// ============================================================

export { validateSelection, ensureRequiredDetectors, getUnknownDetectors }
export type { DetectorSelectProps }
