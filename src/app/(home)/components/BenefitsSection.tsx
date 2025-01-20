import { Brain, Sparkles, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const benefits = [
  {
    icon: Brain,
    title: "Increased Productivity",
    description:
      "Leverage AI to streamline your workflow and accomplish more in less time.",
    color: "text-purple-500",
    gradient: "from-purple-500/20 to-purple-500/0",
  },
  {
    icon: Shield,
    title: "Reduced Stress",
    description:
      "Let the AI handle the complexities of scheduling, so you can focus on what matters.",
    color: "text-indigo-500",
    gradient: "from-indigo-500/20 to-indigo-500/0",
  },
  {
    icon: Sparkles,
    title: "Data-Driven Insights",
    description:
      "Make informed decisions about your time management based on personalized analytics.",
    color: "text-pink-500",
    gradient: "from-pink-500/20 to-pink-500/0",
  },
  {
    icon: Zap,
    title: "Continuous Improvement",
    description:
      "The AI learns from your habits and preferences to provide increasingly accurate suggestions.",
    color: "text-purple-500",
    gradient: "from-purple-500/20 to-purple-500/0",
  },
];

export default function BenefitsSection() {
  return (
    <section
      id="benefits"
      className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 py-24 sm:py-32"
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,#1e1b4b_1px,transparent_1px)] bg-[size:32px_32px] opacity-20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_100%_200px,#3b0764,transparent)]" />
      <div className="absolute right-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-purple-600/20 blur-[120px]" />
      <div className="absolute left-0 bottom-0 h-[300px] w-[300px] rounded-full bg-purple-600/20 blur-[120px]" />

      <div className="container relative mx-auto px-4">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-sm text-purple-200 backdrop-blur-sm">
            <Sparkles className="mr-2 h-3.5 w-3.5 text-purple-300" />
            Why Choose Us
          </div>

          <h2 className="mt-6 bg-gradient-to-br from-white via-purple-100 to-purple-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl lg:text-5xl">
            Experience the Power of AI Planning
          </h2>

          <p className="mt-4 max-w-2xl text-lg text-purple-100/80">
            Discover how our intelligent features can transform your
            productivity and help you achieve more
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group relative rounded-2xl border border-purple-500/10 bg-gray-900/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-purple-500/30 hover:bg-gray-900/80"
            >
              <div
                className={cn(
                  "absolute right-0 top-0 h-48 w-48 rounded-full blur-[64px] transition-opacity duration-300 group-hover:opacity-70",
                  benefit.gradient,
                )}
              />

              <div className="relative">
                <div
                  className={cn(
                    "mb-4 inline-flex rounded-xl bg-gray-900/80 p-3",
                    benefit.color,
                  )}
                >
                  <benefit.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-white">
                  {benefit.title}
                </h3>
                <p className="text-purple-100/70">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
