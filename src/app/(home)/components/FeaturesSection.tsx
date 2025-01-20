import { Brain, Sparkles, Zap, Clock, BarChart2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Task Management",
    description:
      "Intelligent task prioritization and organization with advanced AI algorithms",
    color: "text-purple-500",
    gradient: "from-purple-500/20 to-purple-500/0",
  },
  {
    icon: BarChart2,
    title: "Smart Analytics",
    description:
      "Gain deep insights into your productivity patterns and work habits",
    color: "text-indigo-500",
    gradient: "from-indigo-500/20 to-indigo-500/0",
  },
  {
    icon: Calendar,
    title: "Intelligent Scheduling",
    description: "Optimize your daily schedule with AI-driven time management",
    color: "text-pink-500",
    gradient: "from-pink-500/20 to-pink-500/0",
  },
  {
    icon: Clock,
    title: "Time Optimization",
    description:
      "Maximize your productivity with smart time allocation suggestions",
    color: "text-purple-500",
    gradient: "from-purple-500/20 to-purple-500/0",
  },
  {
    icon: Zap,
    title: "Quick Actions",
    description: "Streamline your workflow with AI-powered task automation",
    color: "text-indigo-500",
    gradient: "from-indigo-500/20 to-indigo-500/0",
  },
  {
    icon: Sparkles,
    title: "Smart Suggestions",
    description: "Get personalized recommendations for better task management",
    color: "text-pink-500",
    gradient: "from-pink-500/20 to-pink-500/0",
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 py-24 sm:py-32"
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_500px_at_50%_200px,#3b0764,transparent)]" />
      <div className="absolute inset-0 bg-[size:16px_16px] bg-purple-950/30 bg-dot-white/[0.1] [-webkit-mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      <div className="absolute right-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-purple-600/20 blur-[120px]" />
      <div className="absolute left-0 bottom-0 h-[300px] w-[300px] rounded-full bg-purple-600/20 blur-[120px]" />

      <div className="container relative mx-auto px-4">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-sm text-purple-200 backdrop-blur-sm">
            <Sparkles className="mr-2 h-3.5 w-3.5 text-purple-300" />
            Powerful Features
          </div>

          <h2 className="mt-6 bg-gradient-to-br from-white via-purple-100 to-purple-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl lg:text-5xl">
            Everything You Need to Stay Productive
          </h2>

          <p className="mt-4 max-w-2xl text-lg text-purple-100/80">
            Discover how our AI-powered features can transform your daily
            planning and boost your productivity
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative rounded-2xl border border-purple-500/10 bg-gray-900/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-purple-500/30 hover:bg-gray-900/80"
            >
              <div
                className={cn(
                  "absolute right-0 top-0 h-48 w-48 rounded-full blur-[64px] transition-opacity duration-300 group-hover:opacity-70",
                  feature.gradient,
                )}
              />

              <div className="relative">
                <div
                  className={cn(
                    "mb-4 inline-flex rounded-xl bg-gray-900/80 p-3",
                    feature.color,
                  )}
                >
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-purple-100/70">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
