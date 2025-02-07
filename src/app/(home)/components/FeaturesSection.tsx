"use client";

import { Brain, Sparkles, Zap, Clock, BarChart2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Task Management",
    description:
      "Intelligent task prioritization and organization with advanced AI algorithms",
    color: "text-[#8B8BCC]",
    gradient: "from-[#2D2B55]/20 to-transparent",
  },
  {
    icon: BarChart2,
    title: "Smart Analytics",
    description:
      "Gain deep insights into your productivity patterns and work habits",
    color: "text-[#A5A5E0]",
    gradient: "from-[#2D2B55]/20 to-transparent",
  },
  {
    icon: Calendar,
    title: "Intelligent Scheduling",
    description: "Optimize your daily schedule with AI-driven time management",
    color: "text-[#9F9FD5]",
    gradient: "from-[#2D2B55]/20 to-transparent",
  },
  {
    icon: Clock,
    title: "Time Optimization",
    description:
      "Maximize your productivity with smart time allocation suggestions",
    color: "text-[#8B8BCC]",
    gradient: "from-[#2D2B55]/20 to-transparent",
  },
  {
    icon: Zap,
    title: "Quick Actions",
    description: "Streamline your workflow with AI-powered task automation",
    color: "text-[#A5A5E0]",
    gradient: "from-[#2D2B55]/20 to-transparent",
  },
  {
    icon: Sparkles,
    title: "Smart Suggestions",
    description: "Get personalized recommendations for better task management",
    color: "text-[#9F9FD5]",
    gradient: "from-[#2D2B55]/20 to-transparent",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function FeaturesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" ref={ref} className="relative py-24 sm:py-32">
      {/* Decorative elements */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 0.5 } : { opacity: 0 }}
        transition={{ duration: 1.5 }}
        className="absolute right-1/2 top-1/2 h-[500px] w-[500px] -translate-y-1/2 translate-x-1/2 rounded-full bg-[#2D2B55]/20 blur-[100px]"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 0.4 } : { opacity: 0 }}
        transition={{ duration: 1.5, delay: 0.2 }}
        className="absolute right-1/4 top-1/4 h-[400px] w-[400px] rounded-full bg-[#2D2B55]/20 blur-[100px]"
      />

      <div className="container relative mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center"
        >
          <div className="inline-flex items-center rounded-full border border-[#2D2B55] bg-[#2D2B55]/10 px-3 py-1 text-sm text-purple-200 backdrop-blur-sm">
            <Sparkles className="mr-2 h-3.5 w-3.5 text-purple-300" />
            Powerful Features
          </div>

          <h2 className="mt-6 bg-gradient-to-br from-white via-[#E4E4E7] to-[#A1A1AA] bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl lg:text-5xl">
            Everything You Need to Stay Productive
          </h2>

          <p className="mt-4 max-w-2xl text-lg text-[#E4E4E7]/80">
            Discover how our AI-powered features can transform your daily
            planning and boost your productivity
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative rounded-2xl border border-[#2D2B55]/20 bg-[#2D2B55]/5 p-6 backdrop-blur-sm transition-all duration-300 hover:border-[#2D2B55]/30 hover:bg-[#2D2B55]/10"
            >
              <div
                className={cn(
                  "absolute right-0 top-0 h-48 w-48 rounded-full blur-[64px] transition-opacity duration-300 group-hover:opacity-70",
                  feature.gradient
                )}
              />

              <div className="relative">
                <div
                  className={cn(
                    "mb-4 inline-flex rounded-xl bg-[#2D2B55]/20 p-3",
                    feature.color
                  )}
                >
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-[#E4E4E7]/70">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
