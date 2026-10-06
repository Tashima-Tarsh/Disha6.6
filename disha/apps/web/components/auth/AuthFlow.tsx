"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Lock, 
  Key, 
  ChevronLeft,
  ArrowRight,
  Eye,
  EyeOff,
  RefreshCcw,
  CheckCircle2,
  Info,
  AlertCircle
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { SpaceLogo } from "@/components/layout/SpaceLogo";

type AuthStep = "welcome" | "identity" | "password" | "mfa" | "verifying" | "success";

export function AuthFlow() {
  const [step, setStep] = useState<AuthStep>("welcome");
  const [showPassword, setShowPassword] = useState(false);
  const [msId, setMsId] = useState("");
  const [mseId, setMseId] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // MFA Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "mfa" && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const validateIdentity = () => {
    if (!msId || !mseId) {
      setError("Please enter both IDs to continue.");
      return;
    }
    setError(null);
    setStep("password");
  };

  const handleSignIn = () => {
    if (!password) {
      setError("Password is required.");
      return;
    }
    setError(null);
    setStep("verifying");
    setTimeout(() => {
      setStep("mfa");
    }, 1500);
  };

  const handleMFAVerify = () => {
    if (otp.some(d => !d)) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    setStep("verifying");
    setTimeout(() => {
      setStep("success");
      setTimeout(() => {
        router.push("/investigate" as any);
      }, 2000);
    }, 2000);
  };

  const stepVariants = {
    initial: { opacity: 0, x: 10 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -10 }
  };

  return (
    <div className="relative z-10 w-full max-w-md mx-auto px-4">
      <AnimatePresence mode="wait">
        {step === "welcome" && (
          <motion.div
            key="welcome"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-center space-y-12"
          >
            <div className="space-y-6">
               <motion.div 
                 animate={{ y: [0, -10, 0] }}
                 transition={{ repeat: Infinity, duration: 4 }}
                 className="w-24 h-24 mx-auto bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center p-0.5 backdrop-blur-xl"
               >
                  <Shield className="text-white w-10 h-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
               </motion.div>
               <div className="space-y-2">
                  <h1 className="text-4xl font-display font-bold text-white tracking-tight">
                    Welcome To Disha
                  </h1>
                  <p className="text-foreground/50 text-base max-w-[280px] mx-auto leading-relaxed">
                    Secure entry to the world's most advanced AGI platform
                  </p>
               </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
               {["Secure", "MFA", "Enterprise", "Protected"].map((badge) => (
                 <span key={badge} className="px-3 py-1 rounded-full border border-white/5 bg-white/5 text-[9px] font-mono uppercase tracking-[0.2em] text-foreground/40">
                   {badge}
                 </span>
               ))}
            </div>

            <div className="pt-4">
              <Button 
                onClick={() => setStep("identity")}
                className="w-full h-14 text-base font-semibold bg-white text-black hover:bg-white/90 rounded-2xl transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
              >
                Login
              </Button>
            </div>
          </motion.div>
        )}

        {(step === "identity" || step === "password" || step === "mfa") && (
          <motion.div
            key="form-card"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <GlassCard className="!p-8 shadow-2xl border-white/10" hover={false}>
              <div className="space-y-8">
                <div className="flex justify-between items-start">
                  <SpaceLogo className="scale-90 origin-left" />
                  {step !== "identity" && step !== "mfa" && (
                    <button 
                      onClick={() => setStep("identity")}
                      className="p-1 hover:bg-white/5 rounded-full transition-colors"
                    >
                      <ChevronLeft className="text-white/40" size={20} />
                    </button>
                  )}
                </div>

                <div className="space-y-6">
                  <AnimatePresence mode="wait">
                    {step === "identity" && (
                      <motion.div key="id-fields" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                        <div className="space-y-2">
                          <h2 className="text-2xl font-semibold text-white">Sign in</h2>
                          <p className="text-sm text-foreground/50">Use your platform credentials</p>
                        </div>

                        <div className="space-y-4">
                          <Input 
                            value={msId}
                            onChange={(e) => setMsId(e.target.value)}
                            placeholder="MS ID"
                            className="h-12 bg-white/5 border-white/10 focus:border-white/20 focus:ring-1 focus:ring-white/10 rounded-xl"
                          />
                          <Input 
                            value={mseId}
                            onChange={(e) => setMseId(e.target.value)}
                            placeholder="MSE ID"
                            className="h-12 bg-white/5 border-white/10 focus:border-white/20 focus:ring-1 focus:ring-white/10 rounded-xl"
                          />
                        </div>

                        {error && <p className="text-red-400 text-xs flex items-center gap-2"><AlertCircle size={14} /> {error}</p>}

                        <div className="flex items-center justify-between pt-2">
                           <span className="text-xs text-white/30 hover:underline cursor-pointer">Don't have an ID?</span>
                           <Button 
                             onClick={validateIdentity}
                             className="bg-ms-blue text-white px-8 h-10 rounded-lg hover:bg-ms-blue/90"
                           >
                              Next
                           </Button>
                        </div>
                      </motion.div>
                    )}

                    {step === "password" && (
                      <motion.div key="pw-fields" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                        <div className="space-y-1">
                          <p className="text-sm text-white/60 mb-1">{msId}</p>
                          <h2 className="text-2xl font-semibold text-white">Enter password</h2>
                        </div>

                        <div className="space-y-4">
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Password"
                              className="h-12 bg-white/5 border-white/10 focus:border-white/20 focus:ring-1 focus:ring-white/10 rounded-xl pr-10"
                            />
                            <button 
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>

                        {error && <p className="text-red-400 text-xs flex items-center gap-2"><AlertCircle size={14} /> {error}</p>}

                        <div className="space-y-4 pt-2">
                           <span className="text-xs text-ms-blue hover:underline cursor-pointer block">Forgot password?</span>
                           <div className="flex justify-end">
                             <Button 
                               onClick={handleSignIn}
                               className="bg-ms-blue text-white px-10 h-10 rounded-lg hover:bg-ms-blue/90"
                             >
                                Sign in
                             </Button>
                           </div>
                        </div>
                      </motion.div>
                    )}

                    {step === "mfa" && (
                      <motion.div key="mfa-fields" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-8">
                        <div className="space-y-2">
                          <h2 className="text-2xl font-semibold text-white">Multi-Factor Authentication</h2>
                          <p className="text-sm text-foreground/50">Enter the verification code from your device</p>
                        </div>

                        <div className="flex justify-between gap-2">
                          {otp.map((digit, i) => (
                            <input
                              key={i}
                              type="text"
                              maxLength={1}
                              className="w-12 h-14 bg-white/5 border border-white/10 rounded-xl text-center text-2xl font-bold focus:border-white/40 focus:ring-1 focus:ring-white/20 outline-none transition-all"
                              value={digit}
                              onChange={(e) => {
                                const newOtp = [...otp];
                                newOtp[i] = e.target.value;
                                setOtp(newOtp);
                                if (e.target.value && i < 5) {
                                  const next = e.target.nextElementSibling as HTMLInputElement;
                                  next?.focus();
                                }
                              }}
                            />
                          ))}
                        </div>

                        <div className="space-y-4 pt-4">
                          <div className="flex justify-end">
                            <Button 
                              onClick={handleMFAVerify}
                              className="bg-ms-blue text-white px-10 h-10 rounded-lg hover:bg-ms-blue/90"
                            >
                               Verify
                            </Button>
                          </div>
                          
                          <div className="flex items-center justify-between px-1">
                            <span className="text-xs text-foreground/40 font-mono">
                              {timer > 0 ? `00:${timer.toString().padStart(2, '0')}` : "Code expired"}
                            </span>
                            <button 
                              disabled={timer > 0}
                              className="text-xs text-ms-blue hover:underline disabled:opacity-50 disabled:no-underline"
                              onClick={() => setTimer(60)}
                            >
                              Resend Code
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {step === "verifying" && (
          <motion.div
            key="verifying"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col items-center justify-center space-y-6"
          >
            <div className="relative w-16 h-16">
               <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                 className="absolute inset-0 border-4 border-white/10 border-t-ms-blue rounded-full"
               />
            </div>
            <p className="text-white/50 font-mono text-xs uppercase tracking-widest animate-pulse">
              Security Protocol: Verifying Identity...
            </p>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div
            key="success"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-center space-y-6"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 10, stiffness: 100 }}
              className="w-20 h-20 mx-auto bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.3)]"
            >
              <CheckCircle2 className="text-white w-12 h-12" />
            </motion.div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-white">Access Granted</h2>
              <p className="text-foreground/50">Initializing secure session for DISHA 6.6</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
