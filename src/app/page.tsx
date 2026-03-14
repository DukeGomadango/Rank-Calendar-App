import Link from "next/link";

import { CtaSection } from "@/components/landing/CtaSection";
import { Faq } from "@/components/landing/Faq";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Trust } from "@/components/landing/Trust";

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <LandingHeader />
      <main>
        <Hero />
        <Trust />
        <Features />
        <HowItWorks />
        <CtaSection />
        <Faq />
        <Footer />
      </main>
      {process.env.NODE_ENV === "development" && (
        <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <Link
            href="/dashboard/calendar"
            className="text-xs text-amber-600 underline-offset-2 hover:underline dark:text-amber-400"
          >
            開発用: カレンダーへ
          </Link>
        </div>
      )}
    </div>
  );
}
