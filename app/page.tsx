import { PublicNav } from "@/components/public-nav"
import { HeroSection } from "@/components/landing/hero-section"
import { InfoBoard } from "@/components/landing/info-board"
import { HowItWorks } from "@/components/landing/how-it-works"
import { JourneySection } from "@/components/landing/journey-section"
import { PricingSection } from "@/components/landing/pricing-section"
import { TargetAudience } from "@/components/landing/target-audience"
import { Footer } from "@/components/landing/footer"

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <PublicNav />
      <HeroSection />
      <InfoBoard />
      <TargetAudience />
      <HowItWorks />
      <JourneySection />
      <PricingSection />
      <Footer />
    </main>
  )
}
