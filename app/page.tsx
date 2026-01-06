"use client"

import { PublicNav } from "@/components/public-nav"
import { HeroSection } from "@/components/landing/hero-section"
import { InfoBoard } from "@/components/landing/info-board"
import { DashboardPreview } from "@/components/landing/dashboard-preview"
import { HowItWorks } from "@/components/landing/how-it-works"
import { TargetAudience } from "@/components/landing/target-audience"
import { PricingSection } from "@/components/landing/pricing-section"
import { Footer } from "@/components/landing/footer"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/80">
      <PublicNav />
      <HeroSection />
      <InfoBoard />
      <DashboardPreview />
      <HowItWorks />
      <TargetAudience />
      <PricingSection />
      <Footer />
    </div>
  )
}
