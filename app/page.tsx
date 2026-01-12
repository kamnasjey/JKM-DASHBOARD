import { PublicNav } from "@/components/public-nav"
import { HeroSection } from "@/components/landing/hero-section"
import { InfoBoard } from "@/components/landing/info-board"
import { HowItWorks } from "@/components/landing/how-it-works"
import { JourneySection } from "@/components/landing/journey-section"
import { PricingSection } from "@/components/landing/pricing-section"
import { TargetAudience } from "@/components/landing/target-audience"
import { Footer } from "@/components/landing/footer"
import { ComingSoonLanding } from "@/components/landing/coming-soon"

const LAUNCH_MODE = process.env.NEXT_PUBLIC_LAUNCH_MODE || "live"

export default function LandingPage() {
  // Feature flag: "coming-soon" shows teaser, "live" shows full product
  if (LAUNCH_MODE === "coming-soon") {
    return <ComingSoonLanding />
  }

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
