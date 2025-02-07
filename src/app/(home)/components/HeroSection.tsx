"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function HeroSection() {
  return (
    <header className="relative">
      {/* Decorative elements */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 1.5 }}
        className="absolute right-1/2 top-1/2 h-[500px] w-[500px] -translate-y-1/2 translate-x-1/2 rounded-full bg-[#2D2B55]/20 blur-[100px]"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1.5, delay: 0.2 }}
        className="absolute right-1/4 top-1/4 h-[400px] w-[400px] rounded-full bg-[#2D2B55]/20 blur-[100px]"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: 1.5, delay: 0.4 }}
        className="absolute left-1/4 bottom-1/4 h-[300px] w-[300px] rounded-full bg-[#2D2B55]/20 blur-[100px]"
      />

      <div className="container relative mx-auto px-4 py-24 sm:py-32 lg:py-40">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center rounded-full border border-[#2D2B55] bg-[#2D2B55]/10 px-3 py-1 text-sm text-purple-200 backdrop-blur-sm"
          >
            <Sparkles className="mr-2 h-3.5 w-3.5 text-purple-300" />
            AI-Powered Task Management
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 max-w-4xl bg-gradient-to-br from-white via-[#E4E4E7] to-[#A1A1AA] bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl lg:text-6xl"
          >
            Transform Your Productivity with Intelligent Planning
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 max-w-2xl text-lg text-[#E4E4E7]/80"
          >
            Experience the future of task management with our AI assistant.
            Optimize your workflow, reduce stress, and accomplish more with
            intelligent scheduling and personalized insights.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col gap-4 sm:flex-row"
          >
            <Button
              asChild
              size="lg"
              className="gap-2 bg-[#2D2B55] text-white transition-all duration-300 hover:bg-[#2D2B55]/90 hover:shadow-lg hover:shadow-[#2D2B55]/20"
            >
              <Link href="/dashboard">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="gap-2 border-[#2D2B55] bg-[#2D2B55]/5 text-purple-100 backdrop-blur-sm transition-all duration-300 hover:border-[#2D2B55]/50 hover:bg-[#2D2B55]/10 hover:text-white hover:shadow-lg hover:shadow-[#2D2B55]/10"
            >
              <Link href="#features">
                <Brain className="h-4 w-4" /> See How It Works
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
