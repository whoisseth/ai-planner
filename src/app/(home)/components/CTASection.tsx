"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

export default function CTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative py-24 sm:py-32">
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
            Start Your Journey
          </div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 bg-gradient-to-br from-white via-[#E4E4E7] to-[#A1A1AA] bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl lg:text-5xl"
          >
            Ready to Transform Your Productivity?
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 max-w-2xl text-lg text-[#E4E4E7]/80"
          >
            Join thousands of users who have revolutionized their daily planning
            with our AI-powered assistant. Start your free trial today and
            experience the future of task management.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center"
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
              className="gap-2 border-[#2D2B55] bg-[#2D2B55]/5 text-purple-100 backdrop-blur-sm transition-all duration-300 hover:border-[#2D2B55]/30 hover:bg-[#2D2B55]/10 hover:text-white hover:shadow-lg hover:shadow-[#2D2B55]/10"
            >
              <Link href="#features">See How It Works</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
