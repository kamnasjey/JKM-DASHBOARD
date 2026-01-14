"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Search, Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Detector {
  name: string
  doc?: string
  enabled?: boolean
}

interface DetectorConfigModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  detectors: Detector[]
  selectedDetectors: string[]
  onSave: (selected: string[]) => void
  readOnly?: boolean
}

export function DetectorConfigModal({
  open,
  onOpenChange,
  detectors,
  selectedDetectors,
  onSave,
  readOnly = false,
}: DetectorConfigModalProps) {
  const [selected, setSelected] = React.useState<string[]>(selectedDetectors)
  const [search, setSearch] = React.useState("")

  React.useEffect(() => {
    setSelected(selectedDetectors)
  }, [selectedDetectors, open])

  const filteredDetectors = detectors.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  )

  const toggleDetector = (name: string) => {
    if (readOnly) return
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((d) => d !== name) : [...prev, name]
    )
  }

  const handleSave = () => {
    onSave(selected)
    onOpenChange(false)
  }

  const selectAll = () => {
    if (readOnly) return
    setSelected(detectors.map((d) => d.name))
  }

  const clearAll = () => {
    if (readOnly) return
    setSelected([])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0D1229] border-[#1E2749] text-[#F0F4FF] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-[#F0F4FF] text-lg uppercase tracking-wide">
            Configure Detectors
          </DialogTitle>
          <DialogDescription className="text-[#A0A8C0] text-sm">
            {readOnly
              ? "View active detectors for this strategy."
              : "Select which detectors to include in the simulation."}
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6C7BA8]" />
          <Input
            placeholder="Search detectors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#0A0E27] border-[#1E2749] text-[#F0F4FF] placeholder:text-[#6C7BA8]"
          />
        </div>

        {/* Quick actions */}
        {!readOnly && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="text-xs border-[#1E2749] text-[#A0A8C0] hover:bg-[#1E2749] hover:text-[#F0F4FF]"
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="text-xs border-[#1E2749] text-[#A0A8C0] hover:bg-[#1E2749] hover:text-[#F0F4FF]"
            >
              Clear All
            </Button>
            <span className="ml-auto text-xs text-[#6C7BA8] self-center">
              {selected.length} selected
            </span>
          </div>
        )}

        {/* Detector list */}
        <div className="max-h-[300px] overflow-y-auto space-y-1 pr-2">
          {filteredDetectors.length === 0 ? (
            <p className="text-sm text-[#6C7BA8] text-center py-4">
              No detectors found
            </p>
          ) : (
            filteredDetectors.map((detector) => (
              <div
                key={detector.name}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all duration-150",
                  selected.includes(detector.name)
                    ? "border-[#3B82F6]/50 bg-[#3B82F6]/10"
                    : "border-[#1E2749] bg-[#0A0E27] hover:border-[#2A3556]",
                  !readOnly && "cursor-pointer"
                )}
                onClick={() => toggleDetector(detector.name)}
              >
                <Checkbox
                  checked={selected.includes(detector.name)}
                  onCheckedChange={() => toggleDetector(detector.name)}
                  disabled={readOnly}
                  className="border-[#6C7BA8] data-[state=checked]:bg-[#3B82F6] data-[state=checked]:border-[#3B82F6]"
                />
                <span className="text-sm font-medium text-[#F0F4FF] flex-1">
                  {detector.name}
                </span>
                {detector.doc && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-[#6C7BA8] cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent
                        side="left"
                        className="max-w-[250px] bg-[#1E2749] text-[#F0F4FF] border-[#2A3556]"
                      >
                        <p className="text-xs">{detector.doc}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#1E2749] text-[#A0A8C0] hover:bg-[#1E2749] hover:text-[#F0F4FF]"
          >
            Cancel
          </Button>
          {!readOnly && (
            <Button
              onClick={handleSave}
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
            >
              Save Configuration
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
