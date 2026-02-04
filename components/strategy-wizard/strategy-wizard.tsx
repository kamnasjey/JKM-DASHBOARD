"use client"

import { useState, useMemo, useCallback } from "react"
import { ChevronLeft, ChevronRight, Check, Sparkles, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { StyleSelector } from "./style-selector"
import {
  TRADING_STYLES,
  getTradingStyleById,
  getRecommendedDetectorsForStyle,
  isDetectorCompatibleWithStyle,
  getIncompatibilityReason,
  type TradingStyle,
} from "@/lib/detectors/trading-styles"
import {
  DETECTOR_CATALOG,
  DETECTORS_BY_CATEGORY,
  CATEGORY_INFO,
  validateSelection,
  ensureRequiredDetectors,
  getDetectorById,
  type DetectorMeta,
} from "@/lib/detectors/catalog"
import {
  getHighSynergyDetectors,
  getConflictingDetectors,
  checkConflicts,
} from "@/lib/detectors/synergies"

// ============================================================
// Types
// ============================================================

type WizardStep = "style" | "triggers" | "confluence" | "settings"

interface WizardState {
  step: WizardStep
  style: TradingStyle | null
  selectedDetectors: string[]
  name: string
  minRR: number
}

interface StrategyWizardProps {
  /** Whether the wizard dialog is open */
  open: boolean
  /** Callback when dialog is closed */
  onOpenChange: (open: boolean) => void
  /** Callback when strategy is created */
  onComplete: (strategy: {
    name: string
    detectors: string[]
    minRR: number
    style: TradingStyle | null
  }) => void
  /** Disabled state */
  disabled?: boolean
}

// ============================================================
// Step Components
// ============================================================

function StepIndicator({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: { id: WizardStep; label: string }[]
  currentStep: WizardStep
  onStepClick?: (step: WizardStep) => void
}) {
  const currentIndex = steps.findIndex(s => s.id === currentStep)

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = step.id === currentStep
        const isClickable = onStepClick && index <= currentIndex

        return (
          <div key={step.id} className="flex items-center">
            {index > 0 && (
              <div
                className={cn(
                  "w-8 h-0.5 mx-1",
                  isCompleted ? "bg-primary" : "bg-muted"
                )}
              />
            )}
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                isCurrent && "bg-primary text-primary-foreground",
                isCompleted && !isCurrent && "bg-primary/20 text-primary",
                !isCurrent && !isCompleted && "bg-muted text-muted-foreground",
                isClickable && "cursor-pointer hover:opacity-80"
              )}
            >
              {isCompleted && !isCurrent ? (
                <Check className="h-3 w-3" />
              ) : (
                <span>{index + 1}</span>
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}

function DetectorSelector({
  category,
  style,
  selectedDetectors,
  onToggle,
  showRecommended = true,
}: {
  category: "trigger" | "confluence"
  style: TradingStyle | null
  selectedDetectors: string[]
  onToggle: (id: string) => void
  showRecommended?: boolean
}) {
  const styleData = style ? getTradingStyleById(style) : null
  const recommended = styleData
    ? category === "trigger"
      ? styleData.recommendedTriggers
      : styleData.recommendedConfluence
    : []

  const detectors = DETECTORS_BY_CATEGORY[category]

  // Sort: recommended first
  const sortedDetectors = [...detectors].sort((a, b) => {
    const aRec = recommended.includes(a.id) ? 0 : 1
    const bRec = recommended.includes(b.id) ? 0 : 1
    return aRec - bRec
  })

  const categoryInfo = CATEGORY_INFO[category]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">{categoryInfo.icon}</span>
        <div>
          <h3 className="font-semibold">{categoryInfo.labelEn}</h3>
          <p className="text-xs text-muted-foreground">{categoryInfo.descEn}</p>
        </div>
      </div>

      {showRecommended && styleData && (
        <Alert className="py-2 border-primary/30 bg-primary/5">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertDescription className="text-xs">
            <span className="font-medium">{styleData.labelEn}</span> style-д тохирсон{" "}
            {category === "trigger" ? "trigger" : "confluence"} detector-уудыг ✨ тэмдэглэв
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
        {sortedDetectors.map((detector) => {
          const isSelected = selectedDetectors.includes(detector.id)
          const isRecommended = recommended.includes(detector.id)
          const isIncompatible = style && !isDetectorCompatibleWithStyle(detector.id, style)
          const incompatibilityReason = style ? getIncompatibilityReason(detector.id, style) : null
          const synergies = getHighSynergyDetectors(detector.id, 80)
          const hasSynergyWithSelected = synergies.some(s => selectedDetectors.includes(s))

          return (
            <div
              key={detector.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                isSelected
                  ? "bg-primary/5 border-primary/30"
                  : "bg-card/50 border-border/50 hover:border-border hover:bg-muted/30",
                isIncompatible && "opacity-60",
                isRecommended && !isSelected && "border-primary/20 bg-primary/5"
              )}
              onClick={() => onToggle(detector.id)}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggle(detector.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{detector.labelEn}</span>
                  {isRecommended && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/50 text-primary">
                      ✨ Recommended
                    </Badge>
                  )}
                  {hasSynergyWithSelected && !isRecommended && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500/50 text-green-600">
                      🔥 Synergy
                    </Badge>
                  )}
                  {isIncompatible && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-500/50 text-yellow-600">
                      ⚠️ Conflict
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {detector.descEn}
                </p>
                {isIncompatible && incompatibilityReason && (
                  <p className="text-[10px] text-yellow-600 mt-1">
                    {incompatibilityReason}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SettingsStep({
  name,
  onNameChange,
  minRR,
  onMinRRChange,
  selectedDetectors,
  style,
}: {
  name: string
  onNameChange: (name: string) => void
  minRR: number
  onMinRRChange: (rr: number) => void
  selectedDetectors: string[]
  style: TradingStyle | null
}) {
  const validation = validateSelection(selectedDetectors)
  const conflicts = checkConflicts(selectedDetectors)
  const styleData = style ? getTradingStyleById(style) : null

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Стратегийн тохиргоо</h3>
        <p className="text-sm text-muted-foreground">
          Нэр болон параметр тохируулаарай
        </p>
      </div>

      {/* Strategy Name */}
      <div className="space-y-2">
        <Label htmlFor="wizard-name">Стратегийн нэр *</Label>
        <Input
          id="wizard-name"
          placeholder={`My ${styleData?.labelEn || "Custom"} Strategy`}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>


      {/* Summary */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="font-medium text-sm">Сонгосон Detectors ({selectedDetectors.length})</h4>
          <div className="flex flex-wrap gap-1">
            {selectedDetectors.map(id => {
              const detector = getDetectorById(id)
              const category = detector?.category || "trigger"
              const info = CATEGORY_INFO[category]
              return (
                <Badge key={id} variant="secondary" className="text-xs">
                  <span className="mr-1">{info?.icon}</span>
                  {detector?.labelShort || id}
                </Badge>
              )
            })}
          </div>

          {/* Validation */}
          {!validation.isValid && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {validation.errors.join("; ")}
              </AlertDescription>
            </Alert>
          )}

          {/* Conflicts */}
          {conflicts.length > 0 && (
            <Alert className="py-2 border-yellow-500/30 bg-yellow-500/5">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-xs text-yellow-600">
                <span className="font-medium">Анхааруулга:</span>{" "}
                {conflicts.map(c => `${c.detectorA} + ${c.detectorB}`).join(", ")} conflict байна
              </AlertDescription>
            </Alert>
          )}

          {/* Style Info */}
          {styleData && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{styleData.icon}</span>
              <span>{styleData.labelEn} style</span>
              {styleData.recommendedSettings?.symbols && (
                <>
                  <span>•</span>
                  <span>Best: {styleData.recommendedSettings.symbols.slice(0, 2).join(", ")}</span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

const STEPS: { id: WizardStep; label: string }[] = [
  { id: "style", label: "Style" },
  { id: "triggers", label: "Triggers" },
  { id: "confluence", label: "Confluence" },
  { id: "settings", label: "Settings" },
]

export function StrategyWizard({
  open,
  onOpenChange,
  onComplete,
  disabled = false,
}: StrategyWizardProps) {
  const [state, setState] = useState<WizardState>({
    step: "style",
    style: null,
    selectedDetectors: ensureRequiredDetectors([]),
    name: "",
    minRR: 2.7,
  })

  // Auto-select recommended detectors when style changes
  const handleStyleSelect = useCallback((style: TradingStyle) => {
    const styleData = getTradingStyleById(style)
    if (!styleData) {
      setState(prev => ({ ...prev, style }))
      return
    }

    // Auto-add recommended gates
    const autoDetectors = ensureRequiredDetectors([
      ...styleData.recommendedGates,
    ])

    setState(prev => ({
      ...prev,
      style,
      selectedDetectors: autoDetectors,
      minRR: styleData.recommendedSettings?.minRR || 2.7,
    }))
  }, [])

  const handleToggleDetector = useCallback((id: string) => {
    setState(prev => {
      const isSelected = prev.selectedDetectors.includes(id)
      const newDetectors = isSelected
        ? prev.selectedDetectors.filter(d => d !== id)
        : [...prev.selectedDetectors, id]
      return {
        ...prev,
        selectedDetectors: ensureRequiredDetectors(newDetectors),
      }
    })
  }, [])

  const goToStep = useCallback((step: WizardStep) => {
    setState(prev => ({ ...prev, step }))
  }, [])

  const nextStep = useCallback(() => {
    const currentIndex = STEPS.findIndex(s => s.id === state.step)
    if (currentIndex < STEPS.length - 1) {
      setState(prev => ({ ...prev, step: STEPS[currentIndex + 1].id }))
    }
  }, [state.step])

  const prevStep = useCallback(() => {
    const currentIndex = STEPS.findIndex(s => s.id === state.step)
    if (currentIndex > 0) {
      setState(prev => ({ ...prev, step: STEPS[currentIndex - 1].id }))
    }
  }, [state.step])

  const handleComplete = useCallback(() => {
    onComplete({
      name: state.name,
      detectors: state.selectedDetectors,
      minRR: state.minRR,
      style: state.style,
    })
    // Reset state
    setState({
      step: "style",
      style: null,
      selectedDetectors: ensureRequiredDetectors([]),
      name: "",
      minRR: 2.7,
    })
    onOpenChange(false)
  }, [state, onComplete, onOpenChange])

  const canProceed = useMemo(() => {
    switch (state.step) {
      case "style":
        return state.style !== null
      case "triggers":
        const triggers = state.selectedDetectors.filter(
          id => getDetectorById(id)?.category === "trigger"
        )
        return triggers.length >= 1
      case "confluence":
        return true // Confluence is optional
      case "settings":
        const validation = validateSelection(state.selectedDetectors)
        return validation.isValid && state.name.trim().length > 0
      default:
        return false
    }
  }, [state])

  const currentStepIndex = STEPS.findIndex(s => s.id === state.step)
  const isLastStep = currentStepIndex === STEPS.length - 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Strategy Builder Wizard
          </DialogTitle>
          <DialogDescription>
            4 алхамаар өөрийн стратеги үүсгээрэй
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <StepIndicator
          steps={STEPS}
          currentStep={state.step}
          onStepClick={goToStep}
        />

        {/* Step Content */}
        <div className="py-4">
          {state.step === "style" && (
            <StyleSelector
              selected={state.style}
              onSelect={handleStyleSelect}
              disabled={disabled}
            />
          )}

          {state.step === "triggers" && (
            <DetectorSelector
              category="trigger"
              style={state.style}
              selectedDetectors={state.selectedDetectors}
              onToggle={handleToggleDetector}
            />
          )}

          {state.step === "confluence" && (
            <DetectorSelector
              category="confluence"
              style={state.style}
              selectedDetectors={state.selectedDetectors}
              onToggle={handleToggleDetector}
            />
          )}

          {state.step === "settings" && (
            <SettingsStep
              name={state.name}
              onNameChange={(name) => setState(prev => ({ ...prev, name }))}
              minRR={state.minRR}
              onMinRRChange={(minRR) => setState(prev => ({ ...prev, minRR }))}
              selectedDetectors={state.selectedDetectors}
              style={state.style}
            />
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStepIndex === 0 || disabled}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Өмнөх
          </Button>

          {isLastStep ? (
            <Button
              onClick={handleComplete}
              disabled={!canProceed || disabled}
            >
              <Check className="h-4 w-4 mr-1" />
              Үүсгэх
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={!canProceed || disabled}
            >
              Дараагийн
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default StrategyWizard
