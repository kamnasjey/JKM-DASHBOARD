"use client"

import { HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { useTour } from "./tour-provider"
import { useLanguage } from "@/contexts/language-context"

export function TourButton() {
  const { startTour } = useTour()
  const { lang } = useLanguage()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          onClick={startTour}
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {lang === "mn" ? "Заавар харах" : "Start Tour"}
      </TooltipContent>
    </Tooltip>
  )
}
