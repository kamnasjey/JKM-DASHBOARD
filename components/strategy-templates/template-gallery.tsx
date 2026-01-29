"use client"

import { useState, useMemo } from "react"
import { Search, SlidersHorizontal, TrendingUp, Star, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DETECTOR_PRESETS, type DetectorPreset, CATEGORY_INFO, getDetectorById } from "@/lib/detectors/catalog"
import { TemplateCard } from "./template-card"

type SortOption = "winrate" | "trades" | "popular" | "name"

interface TemplateGalleryProps {
  /** Callback when user wants to use a template */
  onUseTemplate: (preset: DetectorPreset) => void
  /** Whether templates are disabled */
  disabled?: boolean
  /** Show compact view */
  compact?: boolean
  /** Custom title */
  title?: string
  /** Show search/filter controls */
  showControls?: boolean
}

export function TemplateGallery({
  onUseTemplate,
  disabled = false,
  compact = false,
  title = "Proven Strategy Templates",
  showControls = true,
}: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("popular")
  const [previewPreset, setPreviewPreset] = useState<DetectorPreset | null>(null)

  // Filter and sort presets
  const filteredPresets = useMemo(() => {
    let presets = [...DETECTOR_PRESETS]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      presets = presets.filter(p =>
        p.nameEn.toLowerCase().includes(query) ||
        p.nameMn.toLowerCase().includes(query) ||
        p.descEn.toLowerCase().includes(query) ||
        p.style?.toLowerCase().includes(query) ||
        p.detectors.some(d => d.toLowerCase().includes(query))
      )
    }

    // Sort
    switch (sortBy) {
      case "winrate":
        presets.sort((a, b) => (b.performance?.winrate ?? 0) - (a.performance?.winrate ?? 0))
        break
      case "trades":
        presets.sort((a, b) => (b.performance?.totalTrades ?? 0) - (a.performance?.totalTrades ?? 0))
        break
      case "popular":
        presets.sort((a, b) => {
          // Popular first, then by winrate
          if (a.isPopular && !b.isPopular) return -1
          if (!a.isPopular && b.isPopular) return 1
          return (b.performance?.winrate ?? 0) - (a.performance?.winrate ?? 0)
        })
        break
      case "name":
        presets.sort((a, b) => a.nameEn.localeCompare(b.nameEn))
        break
    }

    return presets
  }, [searchQuery, sortBy])

  const handleUseTemplate = (preset: DetectorPreset) => {
    onUseTemplate(preset)
    setPreviewPreset(null)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          <h2 className="font-semibold">{title}</h2>
          <Badge variant="secondary" className="text-xs">
            Backtest-verified
          </Badge>
        </div>
      </div>

      {/* Controls */}
      {showControls && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Хайх..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
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

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[140px] h-9">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">🔥 Popular</SelectItem>
              <SelectItem value="winrate">📈 Win Rate</SelectItem>
              <SelectItem value="trades">📊 Trades</SelectItem>
              <SelectItem value="name">🔤 Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Grid */}
      {compact ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filteredPresets.map((preset) => (
            <TemplateCard
              key={preset.id}
              preset={preset}
              onUse={handleUseTemplate}
              disabled={disabled}
              compact
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPresets.map((preset) => (
            <TemplateCard
              key={preset.id}
              preset={preset}
              onUse={handleUseTemplate}
              onPreview={setPreviewPreset}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredPresets.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Хайлтад тохирох template олдсонгүй</p>
          {searchQuery && (
            <Button
              variant="link"
              className="text-xs"
              onClick={() => setSearchQuery("")}
            >
              Хайлтыг цэвэрлэх
            </Button>
          )}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewPreset} onOpenChange={() => setPreviewPreset(null)}>
        {previewPreset && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-2xl">{previewPreset.icon}</span>
                {previewPreset.nameEn}
              </DialogTitle>
              <DialogDescription>
                {previewPreset.descEn}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Performance */}
              {previewPreset.performance && (
                <div className="grid grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <p className="font-bold text-green-600">
                      {previewPreset.performance.winrate}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">Win Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">
                      {previewPreset.performance.totalTrades}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Trades</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-purple-600">
                      {previewPreset.performance.profitFactor.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Profit Factor</p>
                  </div>
                  <div className="text-center">
                    <p className={cn(
                      "font-bold",
                      previewPreset.performance.confidence === "high" && "text-green-600",
                      previewPreset.performance.confidence === "medium" && "text-yellow-600",
                      previewPreset.performance.confidence === "low" && "text-red-600"
                    )}>
                      {previewPreset.performance.confidence === "high" ? "Өндөр" :
                       previewPreset.performance.confidence === "medium" ? "Дунд" : "Бага"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Confidence</p>
                  </div>
                </div>
              )}

              {/* Detectors */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Detectors ({previewPreset.detectors.length})</h4>
                <div className="space-y-1">
                  {(["gate", "trigger", "confluence"] as const).map(category => {
                    const detectors = previewPreset.detectors
                      .map(id => getDetectorById(id))
                      .filter(d => d?.category === category)
                    if (detectors.length === 0) return null
                    const info = CATEGORY_INFO[category]
                    return (
                      <div key={category} className="flex items-start gap-2">
                        <span className="text-sm">{info.icon}</span>
                        <div className="flex flex-wrap gap-1">
                          {detectors.map(d => d && (
                            <Badge key={d.id} variant="secondary" className="text-[10px]">
                              {d.labelShort}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Settings */}
              {previewPreset.recommendedSettings && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Санал болгох тохиргоо</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-muted-foreground">Min RR</p>
                      <p className="font-medium">{previewPreset.recommendedSettings.minRR}+</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-muted-foreground">Symbols</p>
                      <p className="font-medium truncate">
                        {previewPreset.recommendedSettings.symbols.join(", ")}
                      </p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-muted-foreground">Timeframes</p>
                      <p className="font-medium">
                        {previewPreset.recommendedSettings.timeframes.join(", ")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewPreset(null)}>
                Хаах
              </Button>
              <Button onClick={() => handleUseTemplate(previewPreset)}>
                Энэ Template хэрэглэх
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

export default TemplateGallery
