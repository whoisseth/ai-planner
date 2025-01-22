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
    <div className="flex min-h-screen flex-col">
      {/* <LandingNav /> */}
      <Header />
      <HeroSection />
      <FeaturesSection />
      <BenefitsSection />
      <CTASection />
      <FooterSection />
    </div>
  );
}
