import LandingNav from "./components/LandingNav";
import HeroSection from "./components/HeroSection";
import FeaturesSection from "./components/FeaturesSection";
import BenefitsSection from "./components/BenefitsSection";
import CTASection from "./components/CTASection";
import FooterSection from "./components/FooterSection";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { Header } from "../_header/header";

export default async function LandingPage() {
  // const user = await getCurrentUser();
  // if (user) redirect("/dashboard");
  // redirect("/sign-in");
  return (
    <div className="flex min-h-screen flex-col bg-[#0B0A1E]">
      <Header />
      <main className="relative flex-1">
        {/* Global background decorative elements */}
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.02]" />
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_100%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />

        {/* Content sections */}
        <div className="relative">
          <HeroSection />
          <div className="relative">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0B0A1E] to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0B0A1E] to-transparent" />
            <FeaturesSection />
          </div>
          <div className="relative">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0B0A1E] to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0B0A1E] to-transparent" />
            <BenefitsSection />
          </div>
          <div className="relative">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0B0A1E] to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0B0A1E] to-transparent" />
            <CTASection />
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
