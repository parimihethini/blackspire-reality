"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function AnimatedBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-[#0A0F1F]">
      {/* Dynamic Animated Gradient Orbs */}
      <motion.div 
        animate={{ 
            scale: [1, 1.2, 1], 
            opacity: [0.1, 0.2, 0.1],
            x: [0, 50, 0],
            y: [0, 30, 0]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-10%] w-[50rem] h-[50rem] bg-[#4DA3FF] rounded-full blur-[150px]"
      />
      
      <motion.div 
        animate={{ 
            scale: [1, 1.3, 1], 
            opacity: [0.05, 0.15, 0.05],
            x: [0, -40, 0],
            y: [0, -50, 0]
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-[-10%] right-[-10%] w-[45rem] h-[45rem] bg-[#7CC4FF] rounded-full blur-[150px]"
      />

      <motion.div 
        animate={{ 
            scale: [1, 1.1, 1], 
            opacity: [0.03, 0.1, 0.03],
            x: [0, 60, 0],
            y: [0, -30, 0]
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-[40%] left-[30%] w-[35rem] h-[35rem] bg-indigo-500 rounded-full blur-[150px]"
      />
      
      {/* Subtle Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black_10%,transparent_100%)]"></div>
    </div>
  );
}
