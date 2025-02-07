"use client";

import { Brain, Sparkles, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const benefits = [
  {
    icon: Brain,
    title: "Increased Productivity",
    description:
      "Leverage AI to streamline your workflow and accomplish more in less time.",
    color: "text-[#8B8BCC]",
    gradient: "from-[#2D2B55]/20 to-transparent",
  },
  {
    icon: Shield,
    title: "Reduced Stress",
    description:
      "Let the AI handle the complexities of scheduling, so you can focus on what matters.",
    color: "text-[#A5A5E0]",
    gradient: "from-[#2D2B55]/20 to-transparent",
  },
  {
    icon: Sparkles,
    title: "Data-Driven Insights",
    description:
      "Make informed decisions about your time management based on personalized analytics.",
    color: "text-[#9F9FD5]",
    gradient: "from-[#2D2B55]/20 to-transparent",
  },
  {
    icon: Zap,
    title: "Continuous Improvement",
    description:
      "The AI learns from your habits and preferences to provide increasingly accurate suggestions.",
    color: "text-[#8B8BCC]",
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

export default function BenefitsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="benefits" ref={ref} className="relative py-24 sm:py-32">
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
            Why Choose Us
          </div>

          <h2 className="mt-6 bg-gradient-to-br from-white via-[#E4E4E7] to-[#A1A1AA] bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl lg:text-5xl">
            Experience the Power of AI Planning
          </h2>

          <p className="mt-4 max-w-2xl text-lg text-[#E4E4E7]/80">
            Discover how our intelligent features can transform your
            productivity and help you achieve more
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="mt-16 grid gap-8 sm:grid-cols-2"
        >
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative rounded-2xl border border-[#2D2B55]/20 bg-[#2D2B55]/5 p-6 backdrop-blur-sm transition-all duration-300 hover:border-[#2D2B55]/30 hover:bg-[#2D2B55]/10"
            >
              <div
                className={cn(
                  "absolute right-0 top-0 h-48 w-48 rounded-full blur-[64px] transition-opacity duration-300 group-hover:opacity-70",
                  benefit.gradient
                )}
              />

              <div className="relative">
                <div
                  className={cn(
                    "mb-4 inline-flex rounded-xl bg-[#2D2B55]/20 p-3",
                    benefit.color
                  )}
                >
                  <benefit.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-white">
                  {benefit.title}
                </h3>
                <p className="text-[#E4E4E7]/70">{benefit.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
