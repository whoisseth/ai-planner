import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, Sparkles } from "lucide-react";

export default function HeroSection() {
  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      <div className="absolute -top-24 right-0 h-[400px] w-[400px] rounded-full bg-purple-600/20 blur-[120px]" />
      <div className="absolute -bottom-24 left-0 h-[300px] w-[300px] rounded-full bg-indigo-600/20 blur-[120px]" />

      <div className="container relative mx-auto px-4 py-24 sm:py-32 lg:py-40">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-sm text-purple-200 backdrop-blur-sm">
            <Sparkles className="mr-2 h-3.5 w-3.5 text-purple-300" />
            AI-Powered Task Management
          </div>

          <h1 className="mt-6 max-w-4xl bg-gradient-to-br from-white via-purple-100 to-purple-200 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl lg:text-6xl">
            Transform Your Productivity with Intelligent Planning
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-purple-100/80">
            Experience the future of task management with our AI assistant.
            Optimize your workflow, reduce stress, and accomplish more with
            intelligent scheduling and personalized insights.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="gap-2 bg-purple-600 text-white hover:bg-purple-700"
            >
              <Link href="/dashboard">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="gap-2 border-purple-400/20 bg-purple-500/10 text-purple-100 backdrop-blur-sm hover:bg-purple-500/20"
            >
              <Link href="#features">
                <Brain className="h-4 w-4" /> See How It Works
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
