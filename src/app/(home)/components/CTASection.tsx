import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export default function CTASection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 py-24 sm:py-32">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_400px_at_50%_50%,#3b0764,transparent)]" />
      <div className="absolute right-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-purple-600/20 blur-[120px]" />
      <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-purple-600/20 blur-[120px]" />

      <div className="container relative mx-auto px-4">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-sm text-purple-200 backdrop-blur-sm">
            <Sparkles className="mr-2 h-3.5 w-3.5 text-purple-300" />
            Start Your Journey
          </div>

          <h2 className="mt-6 bg-gradient-to-br from-white via-purple-100 to-purple-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl lg:text-5xl">
            Ready to Transform Your Productivity?
          </h2>

          <p className="mt-6 max-w-2xl text-lg text-purple-100/80">
            Join thousands of users who have revolutionized their daily planning
            with our AI-powered assistant. Start your free trial today and
            experience the future of task management.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="gap-2 bg-purple-600 text-white transition-all duration-300 hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-500/20"
            >
              <Link href="/dashboard">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="gap-2 border-purple-500/20 bg-purple-500/5 text-purple-100 transition-all duration-300 hover:border-purple-500/30 hover:bg-purple-500/10 hover:text-white hover:shadow-lg hover:shadow-purple-500/10 backdrop-blur-sm"
            >
              <Link href="#features">See How It Works</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
