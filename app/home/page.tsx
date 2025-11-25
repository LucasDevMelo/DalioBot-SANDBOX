'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaUserPlus, FaLink, FaChartPie, FaStar, FaCheckCircle, FaArrowRight, FaShieldAlt, FaBolt, FaTimes, FaCube } from 'react-icons/fa';
import React, { useState, useRef, useEffect } from 'react';
import { motion, useInView, useScroll, useTransform, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';
import { useAuth } from '@/src/context/authcontext';
import { useRouter } from 'next/navigation';

// --- Componentes de UI Modernos & 3D ---

// 1. Badge Moderno (Mantido)
const SectionBadge = ({ children }: { children: React.ReactNode }) => (
  <div className="relative inline-flex group overflow-hidden rounded-full p-[1px] mb-6">
    <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
    <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950/90 px-4 py-1 text-xs font-medium text-purple-300 backdrop-blur-3xl">
      {children}
    </div>
  </div>
);

// 2. Card com Efeito Tilt 3D (Para Steps e Testimonials)
const TiltCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["12deg", "-12deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-12deg", "12deg"]);
  const translateX = useTransform(mouseXSpring, [-0.5, 0.5], ["-5px", "5px"]);
  const translateY = useTransform(mouseYSpring, [-0.5, 0.5], ["-5px", "5px"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, translateX, translateY, transformStyle: "preserve-3d" }}
      className={`relative perspective-1000 transform-gpu ${className}`}
    >
      <div className="absolute inset-4 bg-purple-600/10 blur-2xl -z-20 rounded-3xl transform translate-z-[-30px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      {children}
    </motion.div>
  );
};


// 3. Hero Container 3D (Efeito Tilt suave no Hero)
const Hero3DContainer = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 100, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 100, damping: 20 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className="relative w-full h-full flex items-center justify-center perspective-[1200px] py-10"
    >
      <motion.div style={{ transform: "translateZ(-60px) scale(0.9)", opacity: 0.4 }} className="absolute inset-10 bg-purple-600/30 blur-[60px] rounded-full -z-10" />
      {children}
    </motion.div>
  );
};

// 4. Browser Frame (Dark Glass)
const BrowserFrame = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`rounded-xl overflow-hidden border border-slate-700/50 bg-slate-800/80 shadow-2xl shadow-black/50 backdrop-blur-xl ${className}`}>
    <div className="bg-slate-900/90 border-b border-slate-700/50 px-4 py-3 flex items-center gap-2">
      <div className="flex gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-inner"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-inner"></div>
        <div className="w-3 h-3 rounded-full bg-green-500/80 shadow-inner"></div>
      </div>
      <div className="ml-4 px-3 py-1 bg-slate-950/50 border border-slate-800 rounded-md text-[10px] text-slate-500 w-full max-w-[200px] hidden sm:flex items-center gap-2 font-mono shadow-inner">
        <FaShieldAlt size={8} className="text-purple-500"/> daliobotbeta.netlify.app
      </div>
    </div>
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-30 pointer-events-none"></div>
    </div>
  </div>
);

// 5. Seção Animada Padrão
function AnimatedSection({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px 0px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}

// 6. Background Shapes 3D
const FloatingShapes = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
            animate={{ y: [0, -40, 0], x: [0, 20, 0], scale: [1, 1.1, 1] }} 
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[15%] left-[10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px]" 
        />
        <motion.div 
            animate={{ y: [0, 50, 0], x: [0, -30, 0], scale: [1, 1.2, 1] }} 
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-[10%] right-[5%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]" 
        />
        <motion.div 
             animate={{ rotateX: [0, 360], rotateY: [0, 360] }}
             transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
             className="absolute top-40 right-40 w-20 h-20 border-2 border-purple-500/20 opacity-30"
             style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
        />
    </div>
);

// --- Modal 3D ---
const Modal = ({ title, children, closeModal }: { title: string, children: React.ReactNode, closeModal: () => void }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 perspective-1000">
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={closeModal}
    />
    <motion.div
      className="bg-slate-900 border border-slate-700 w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl shadow-purple-900/40 relative z-10 overflow-hidden transform-gpu"
      initial={{ opacity: 0, rotateX: 25, y: 80 }}
      animate={{ opacity: 1, rotateX: 0, y: 0 }}
      exit={{ opacity: 0, rotateX: 25, y: 80 }}
      transition={{ type: "spring", damping: 20, stiffness: 200 }}
    >
      <div className="flex justify-between items-center p-6 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><FaCube className="text-purple-500" /> {title}</h2>
        <button onClick={closeModal} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
          <FaTimes />
        </button>
      </div>
      <div className="p-6 overflow-y-auto custom-scrollbar text-slate-300 space-y-4 leading-relaxed text-sm bg-gradient-to-b from-slate-900/50 to-slate-950/50">
        {children}
      </div>
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/80 backdrop-blur-xl flex justify-end">
        <button onClick={closeModal} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40">
          Close
        </button>
      </div>
    </motion.div>
  </div>
);

// --- Componente Principal ---
export default function HomePage() {
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | 'refund' | 'contact' | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const [showCookieConsent, setShowCookieConsent] = useState(false);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const consent = localStorage.getItem('daliobot_cookie_consent');
    if (consent !== 'accepted') setShowCookieConsent(true);
  }, []);

  const handleAcceptCookies = () => {
    localStorage.setItem('daliobot_cookie_consent', 'accepted');
    setShowCookieConsent(false);
  };

  const closeModal = () => setActiveModal(null);

  return (
    <div className="bg-slate-950 text-slate-200 font-sans antialiased overflow-x-hidden selection:bg-purple-500/30 selection:text-purple-200 perspective-[2000px]">

      {/* Background Grid + 3D Shapes */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      </div>
      <FloatingShapes />

      {/* HEADER */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-xl bg-slate-950/60 supports-[backdrop-filter]:bg-slate-950/30"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-4 h-20 flex justify-between items-center">
          <Link href="/" className="text-2xl font-extrabold tracking-tight relative group flex items-center gap-2">
            
            <span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 group-hover:to-white transition-all duration-300">Dalio</span>
                <span className="text-purple-500 group-hover:text-purple-400 transition-colors">bot</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {['Features', 'Testimonials'].map((item) => (
              <Link key={item} href={`#${item.toLowerCase()}`} className="text-sm font-medium text-slate-400 hover:text-purple-400 transition-colors relative group">
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-500 transition-all group-hover:w-full"></span>
              </Link>
            ))}
            <button onClick={() => setActiveModal('contact')} className="text-sm font-medium text-slate-400 hover:text-purple-400 transition-colors relative group">
              Contact
            </button>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Login
            </Link>
            <Link
              href="/login"
              className="group relative inline-flex items-center justify-center px-5 py-2 text-sm font-semibold text-white transition-all duration-200 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-600 focus:ring-offset-slate-900 overflow-hidden"
            >
               <span className="relative flex items-center gap-2">
                Start Free Beta <FaArrowRight className="text-xs group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </div>
        </div>
      </motion.header>

      <main className="relative z-10 pt-20">

        {/* HERO SECTION */}
        <section className="relative pt-20 pb-10 lg:pt-32 lg:pb-24 overflow-visible">
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-16">

              {/* Hero Content (Esquerda) */}
              <motion.div
                className="flex-1 text-center lg:text-left z-20"
                initial={{ opacity: 0, x: -50, rotateY: 10 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <SectionBadge>Public Beta 1.0</SectionBadge>
                <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
                  Stop guessing. <br />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-gradient-x">
                    Start Analyzing.
                  </span>
                </h1>
                <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto lg:mx-0 mb-10">
                    Professional-grade backtesting analysis and portfolio simulations, simplified for individual investors. Get <span className="text-purple-400 font-semibold">1 month free access</span> during our beta.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                  <Link
                    href="/login"
                    className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 rounded-xl font-bold text-lg hover:bg-slate-100 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-15px_rgba(192,132,252,0.5)] hover:-translate-y-1 flex items-center justify-center gap-2 relative overflow-hidden group"
                  >
                     <span className="relative z-10">Get Started Free</span>
                     <div className="absolute inset-0 bg-gradient-to-r from-purple-200 to-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
                  </Link>
                  <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="w-full sm:w-auto px-8 py-4 bg-slate-800/50 text-white rounded-xl font-bold text-lg border border-slate-700/50 hover:border-purple-500/50 hover:bg-slate-800/80 transition-all flex items-center justify-center gap-2 backdrop-blur-sm">
                    View Features
                  </button>
                </div>
              </motion.div>

              {/* Hero Visual (Direita) - CORRIGIDO: Removido zoom CSS, mantido apenas 3D Tilt */}
              <div className="flex-1 w-full max-w-[600px] lg:max-w-none h-[400px] lg:h-[500px] flex items-center justify-center relative z-10">
                 <Hero3DContainer>
                    <div className="relative group w-full transform-style-3d">
                        {/* Glow traseiro */}
                        <div className="absolute -inset-5 bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-3xl blur-2xl opacity-50 animate-pulse-slow transform translate-z-[-20px]"></div>

                        <BrowserFrame className="relative bg-slate-900/90 w-full mx-auto transform-style-3d">
                            <Image
                            src="/dashboard.png"
                            alt="Daliobot Dashboard"
                            width={1200}
                            height={900}
                            // AQUI FOI CORRIGIDO: Removido 'group-hover:scale-105' e 'transition-transform'
                            className="w-full h-auto object-cover object-top block rounded-b-xl shadow-lg"
                            priority
                            />
                        </BrowserFrame>

                        {/* Floating Cards (Mantidos) */}
                        <motion.div
                            style={{ transform: "translateZ(70px) rotateX(5deg)", transformStyle: "preserve-3d" }}
                            className="absolute -bottom-8 -left-8 bg-slate-800/80 backdrop-blur-xl p-4 rounded-2xl border border-slate-700/80 shadow-2xl hidden sm:block"
                            animate={{ y: [0, -15, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-green-500/20 rounded-xl text-green-400 shadow-inner shadow-green-500/20"><FaChartPie size={20} /></div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider">Performance</p>
                                    <p className="text-xl font-black text-white">HIGH</p>
                                </div>
                            </div>
                        </motion.div>

                         <motion.div
                            style={{ transform: "translateZ(50px) rotateZ(-5deg)", transformStyle: "preserve-3d" }}
                            className="absolute -top-8 -right-8 bg-slate-800/80 backdrop-blur-xl p-4 rounded-2xl border border-slate-700/80 shadow-2xl hidden sm:block"
                            animate={{ y: [0, 15, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400 shadow-inner shadow-purple-500/20"><FaBolt size={20} /></div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider">PRODUCTIVITY</p>
                                    <p className="text-xl font-black text-white">HIGH</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                 </Hero3DContainer>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="py-32 relative">
          <div className="container mx-auto px-4 perspective-[2000px]">
            <div className="text-center max-w-3xl mx-auto mb-24">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Unfair Advantage</h2>
              <p className="text-lg text-slate-400">
                Most retail traders fly blind. DalioBot gives you the institutional-grade cockpit.
              </p>
            </div>

            <div className="space-y-40">
              {/* Feature 1 - Unified Portfolio Command */}
              <AnimatedSection>
                <div className="grid md:grid-cols-2 gap-16 items-center transform-style-3d">
                  <div className="order-2 md:order-1" style={{ transform: "translateZ(30px)" }}>
                    <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 border border-purple-500/30 shadow-[0_0_25px_rgba(168,85,247,0.3)] backdrop-blur-md">
                      <FaChartPie className="text-3xl text-purple-400" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-4">Unified Portfolio Command</h3>
                    <p className="text-slate-400 text-lg leading-relaxed mb-6">
                      Stop switching between 5 different broker tabs. View all your assets, cross-reference performance, and track true equity growth in one centralized, beautiful dashboard.
                    </p>
                    <ul className="space-y-3 mb-8">
                      {['Multi-broker integration', 'Real-time equity tracking', 'Diversification metrics'].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-slate-300">
                          <FaCheckCircle className="text-purple-500 text-sm" /> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="order-1 md:order-2 relative group perspective-[1500px] z-10">
                    <div className="absolute -inset-4 bg-gradient-to-r from-purple-600/30 to-blue-600/30 rounded-3xl blur-2xl group-hover:opacity-100 transition duration-700 opacity-0 -z-10 transform translate-z-[-50px]"></div>
                    {/* AQUI FOI ALTERADO: rotateY de -15 para 15 */}
                    <motion.div 
                        whileHover={{ rotateY: 15, rotateX: 10, scale: 1.05 }} 
                        transition={{ type: "spring", stiffness: 100, damping: 20 }} 
                        style={{ transformStyle: "preserve-3d" }}
                        className="shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] rounded-xl"
                    >
                         <BrowserFrame>
                            <Image src="/dashboard2.png" alt="Portfolio" width={600} height={400} className="w-full h-auto rounded-b-xl" />
                         </BrowserFrame>
                    </motion.div>
                  </div>
                </div>
              </AnimatedSection>

              {/* Feature 2 - Monte Carlo Simulations */}
              <AnimatedSection>
                <div className="grid md:grid-cols-2 gap-16 items-center transform-style-3d">
                  <div className="relative group perspective-[1500px] z-10">
                    <div className="absolute -inset-4 bg-gradient-to-r from-fuchsia-600/30 to-purple-600/30 rounded-3xl blur-2xl group-hover:opacity-100 transition duration-700 opacity-0 -z-10 transform translate-z-[-50px]"></div>
                     {/* AQUI FOI ALTERADO: rotateY de 15 para -15 */}
                     <motion.div 
                        whileHover={{ rotateY: -15, rotateX: 10, scale: 1.05 }} 
                        transition={{ type: "spring", stiffness: 100, damping: 20 }} 
                        style={{ transformStyle: "preserve-3d" }}
                        className="shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] rounded-xl"
                    >
                        <BrowserFrame>
                            <Image src="/montecarlosim.png" alt="Monte Carlo" width={600} height={400} className="w-full h-auto rounded-b-xl" style={{ backgroundColor: '#0f172a' }} />
                        </BrowserFrame>
                    </motion.div>
                  </div>
                  <div style={{ transform: "translateZ(30px)" }}>
                    <div className="w-14 h-14 bg-fuchsia-500/20 rounded-2xl flex items-center justify-center mb-6 border border-fuchsia-500/30 shadow-[0_0_25px_rgba(217,70,239,0.3)] backdrop-blur-md">
                      <FaShieldAlt className="text-3xl text-fuchsia-400" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-4">Monte Carlo Simulations</h3>
                    <p className="text-slate-400 text-lg leading-relaxed mb-6">
                      Don't trust a single backtest. Our engine runs thousands of probabilistic scenarios to show you the "Worst Case" and "Best Case" reality. Understand your risk of ruin before you risk a dollar.
                    </p>
                    <ul className="space-y-3 mb-8">
                      {['1,000+ Iterations', 'Risk of Ruin Calculation', 'Confidence Intervals'].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-slate-300">
                          <FaCheckCircle className="text-fuchsia-500 text-sm" /> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* STEPS SECTION */}
        <section className="py-24 relative z-10">
          <div className="absolute inset-0 bg-slate-900/50 skew-y-3 transform-gpu -z-10 border-y border-white/5"></div>
          
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white">How it works</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8 perspective-[1000px]">
              {[
                { icon: FaUserPlus, title: "1. Sign Up", desc: "Create your free account in seconds. No complicated KYC for the beta." },
                { icon: FaLink, title: "2. Upload HTML", desc: "Export your backtest or history from MT5/cTrader and drag & drop it here." },
                { icon: FaChartPie, title: "3. Analyze", desc: "Instantly get a generated report with actionable insights and optimization tips." }
              ].map((step, i) => (
                <AnimatedSection key={i} delay={i * 0.2} className="h-full">
                  <TiltCard className="group h-full bg-slate-800/40 p-8 rounded-3xl border border-slate-700/50 hover:bg-slate-800/70 transition-colors relative backdrop-blur-xl shadow-xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-colors transform translate-z-[-10px]"></div>
                    <step.icon className="text-5xl text-purple-400 mb-8 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300 relative z-10 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                    <h3 className="text-2xl font-bold text-white mb-4 relative z-10">{step.title}</h3>
                    <p className="text-slate-400 leading-relaxed relative z-10">{step.desc}</p>
                  </TiltCard>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section id="testimonials" className="py-32 overflow-hidden relative">
          <div className="container mx-auto px-4 perspective-[1000px]">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-20">Loved by early adopters</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { name: "James S.", role: "Individual Investor", text: "Finally a tool that unifies everything! Daliobot saves me hours every week.", img: "/James.jpg" },
                { name: "Lukas M.", role: "Software Engineer", text: "The UI is incredibly clean. It takes complex data and makes it understandable for non-quants.", img: "/LukasM.jpg" },
                { name: "Antoine D.", role: "Pro Trader", text: "The risk analysis feature (Monte Carlo) saved me from a strategy that looked good but was actually dangerous.", img: "/Antoine.jpg" }
              ].map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, type: "spring", stiffness: 100 }}
                  className="h-full" /* Adicionado: Garante que o container da animação preencha a altura da grid */
                >
                  <TiltCard className="h-full flex flex-col bg-slate-900/60 p-8 rounded-3xl border border-slate-800/80 relative backdrop-blur-xl hover:border-purple-500/30 transition-all group shadow-2xl">
                    <div className="absolute top-6 right-8 text-7xl text-purple-500/10 font-serif transform translate-z-[20px] rotate-12">"</div>
                    <div className="flex text-yellow-500/90 mb-6 text-sm gap-1 relative z-10">
                      {[...Array(5)].map((_, i) => <FaStar key={i} className="drop-shadow-[0_0_5px_rgba(234,179,8,0.3)]" />)}
                    </div>
                    
                    {/* flex-grow garante que o texto ocupe o espaço disponível, empurrando o footer para baixo */}
                    <div className="flex-grow"> 
                        <p className="text-slate-300 italic mb-8 relative z-10 text-base leading-relaxed font-medium">"{t.text}"</p>
                    </div>

                    <div className="flex items-center gap-4 mt-auto border-t border-slate-800/50 pt-6 relative z-10">
                      <div className="w-12 h-12 rounded-full bg-slate-800 relative overflow-hidden ring-2 ring-purple-500/20 group-hover:ring-purple-500/50 transition-all">
                        <Image src={t.img} alt={t.name} fill className="object-cover" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-base">{t.name}</p>
                        <p className="text-slate-500 text-sm">{t.role}</p>
                      </div>
                    </div>
                  </TiltCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-32 relative overflow-hidden perspective-[1000px]">
          <div className="absolute inset-0 bg-purple-900/10"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none animate-pulse-slow"></div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotateX: 20 }}
            whileInView={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ type: "spring", bounce: 0.4 }}
            className="container mx-auto px-4 relative z-10 text-center max-w-4xl transform-style-3d"
          >
            <h2 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tight" style={{ transform: "translateZ(40px)" }}>
              Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 drop-shadow-[0_0_20px_rgba(192,132,252,0.4)]">evolve?</span>
            </h2>
            <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed" style={{ transform: "translateZ(20px)" }}>
              Join the Beta today. 100% Free for the first month. <br/>
              Professionalize your trading setup now.
            </p>
            <div style={{ transform: "translateZ(50px)" }}>
                <Link
                href="/login"
                className="inline-block px-12 py-6 bg-white text-slate-950 font-black text-xl rounded-2xl hover:scale-105 transition-all duration-300 shadow-[0_10px_40px_-10px_rgba(255,255,255,0.5)] hover:shadow-[0_20px_60px_-10px_rgba(255,255,255,0.7)] relative overflow-hidden group"
                >
                   <span className="relative z-10">Start Free Trial Now</span>
                   <div className="absolute inset-0 bg-gradient-to-r from-purple-100 to-white opacity-0 group-hover:opacity-50 transition-opacity"></div>
                </Link>
            </div>
          </motion.div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-950/80 backdrop-blur-xl border-t border-slate-800/80 py-16 text-sm relative z-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <Link href="/" className="text-2xl font-extrabold text-white mb-6 block flex items-center gap-3">
                 <div className="p-2 bg-purple-500/20 rounded-lg"><FaCube className="text-purple-400"/></div> Daliobot
              </Link>
              <p className="text-slate-500 leading-relaxed">
                Automating financial market analysis with institutional-grade precision and 3D visualization.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 text-base">Product</h4>
              <ul className="space-y-3 text-slate-400">
                <li><Link href="#features" className="hover:text-purple-400 transition-colors">Features</Link></li>
                <li><Link href="/login" className="hover:text-purple-400 transition-colors">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 text-base">Legal</h4>
              <ul className="space-y-3 text-slate-400">
                <li><button onClick={() => setActiveModal('terms')} className="hover:text-purple-400 transition-colors text-left">Terms of Service</button></li>
                <li><button onClick={() => setActiveModal('privacy')} className="hover:text-purple-400 transition-colors text-left">Privacy Policy</button></li>
                <li><button onClick={() => setActiveModal('refund')} className="hover:text-purple-400 transition-colors text-left">Refund Policy</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 text-base">Company</h4>
              <ul className="space-y-3 text-slate-400">
                <li><button onClick={() => setActiveModal('contact')} className="hover:text-purple-400 transition-colors">Contact</button></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800/50 text-center text-slate-600 flex flex-col md:flex-row justify-between items-center gap-4">
            <span>&copy; {new Date().getFullYear()} Daliobot. All rights reserved.</span>
             <div className="flex gap-4">
                <FaStar className="text-slate-700 hover:text-purple-500 transition-colors cursor-pointer"/>
                <FaChartPie className="text-slate-700 hover:text-purple-500 transition-colors cursor-pointer"/>
            </div>
          </div>
        </div>
      </footer>

      {/* MODALS COM TEXTO COMPLETO */}

      {/* Terms Modal */}
      {activeModal === 'terms' && (
        <Modal title="Terms of Service" closeModal={closeModal}>
          <p>Please carefully read the terms and conditions set out below (“Terms of Use”) so that you can enjoy our platform and all the services available through it, all of which are the exclusive property of the website www.daliobot.com.br. By using the platform, our products and/or services, including our content made available through the Platform, you are agreeing to these Terms of Use. If you do not agree, we ask that you do not use our products and/or services, as your use represents your full acceptance of these Terms of Use.</p>
          <p>Tolerance regarding the non-compliance with any obligation set forth in the Platform's Terms of Use will not signify a waiver of the right to demand compliance with the obligation, nor an alteration of any term or condition contained herein.</p>
          <p>For a better experience for its Users, DalioBot may, from time to time, partially or fully change the Terms of Use. But, of course: in the event of a change, you will be informed when you access the platform again, whether logged in or not, and the user will be required to accept the Terms of Use again. In the specific case of processing personal data or sensitive data, you will be fully informed about any and all actions taken in this regard, providing prior consent whenever necessary. If you do not agree with the changes we have made, you can cancel your account and cease any and all use of the products and services.</p>
          <ol className="list-decimal list-inside space-y-3 mt-4 pl-2 text-slate-400">
            <li>The history of profitability or analysis is not a guarantee of future returns. The variable income market involves risks and is subject to various eventualities and external effects that involve unpredictability and, thus, financial risks. Furthermore, results may vary from person to person, according to the operations carried out by each individual.</li>
            <li>The "DalioBot" website is not responsible for any type of financial transaction between the user and the developer/company that is marketing the robot. We only connect investors and validated automated strategies. The entire hiring process is done directly between the person responsible for the strategy and the user.</li>
            <li>The statistical data of all robots are provided directly by the developer. Therefore, the accuracy of the information is their sole responsibility.</li>
            <li>By registering a robot, you agree that the data contained in the import CSV has not been manipulated.</li>
            <li>The site offers no warranty linked to the Platform, and its use, and is not responsible for any damages or losses resulting from its use. The use of the Platform and the disclosed robots is the sole responsibility of the user, who must use their own knowledge and techniques to decide on their investments.</li>
          </ol>
          <p className="font-bold text-white mt-4">Using the Beta Version:</p>
          <p>This version of the platform is a free beta, offered for a limited time to test its features. All features are provided "as is" and may contain bugs or be subject to changes. The DalioBot website is not responsible, under any circumstances, for any damage or loss, material or moral, related to the use of the platform during the beta period.</p>
          <p>The "Payment Processing" and pricing sections are not applicable to the Beta Version. However, please read our general terms of use, as they apply to the use of all our services.</p>
        </Modal>
      )}

      {/* Privacy Modal */}
      {activeModal === 'privacy' && (
        <Modal title="Privacy Policy" closeModal={closeModal}>
          <p>Welcome to DalioBot! Your privacy is critically important to us. This Privacy Policy outlines how we collect, use, store, share, and protect your information when you use our platform.</p>
          <h3 className="text-md font-semibold text-white pt-2">1. Data We Collect</h3>
          <ul className="list-disc list-inside space-y-2 text-slate-400">
            <li><strong>Account Information:</strong> When you register, we collect your name, email address, and a hashed password.</li>
            <li><strong>Backtest and Portfolio Data:</strong> We store all data from your uploaded `.csv` files and the portfolios you create. This sensitive data is used solely to provide you with analysis within your account and is never shared.</li>
            <li><strong>Usage Data:</strong> We automatically collect technical and usage data to improve our service.</li>
          </ul>
          <h3 className="text-md font-semibold text-white pt-2">2. How We Use Your Data</h3>
          <p>We use your data to provide and maintain the service, improve the platform, communicate with you, ensure security, and process payments.</p>
          <h3 className="text-md font-semibold text-white pt-2">3. Data Sharing</h3>
          <p>We do not sell your personal information. We only share data with essential partners for platform operation, such as cloud infrastructure providers (Firebase/Google Cloud) and payment processors, under strict confidentiality agreements.</p>
          <h3 className="text-md font-semibold text-white pt-2">4. Your Rights</h3>
          <p>In accordance with data protection laws like LGPD, you have the right to access, correct, delete, or transfer your data, and revoke consent. To exercise your rights, please contact us.</p>
          <h3 className="text-md font-semibold text-white pt-2">5. Contact Us</h3>
          <p>If you have any questions about this Privacy Policy, please contact us at: <span className="font-medium text-purple-400">daliobot@gmail.com</span></p>
        </Modal>
      )}

      {/* Refund Modal */}
      {activeModal === 'refund' && (
        <Modal title="Refund Policy" closeModal={closeModal}>
          <p>At DalioBot, we want you to be completely satisfied with your purchase. We offer a 14-day money-back guarantee for all our plans.</p>
          <p>If for any reason you are not satisfied with our service within the first 14 days of your initial subscription (monthly or annual), please contact us at <span className="font-medium text-purple-400">daliobot@gmail.com</span> to request a full refund.</p>
          <p>For the "Founder's Pack" (Lifetime Subscription), the period for a refund request is also 14 days from the date of purchase.</p>
          <p>Please note that refunds are processed through our payment partner, Paddle.com, and may take 5-10 business days to appear on your statement.</p>
        </Modal>
      )}

      {/* Contact Modal */}
      {activeModal === 'contact' && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div
            className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl shadow-purple-900/20 max-w-sm w-full text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white flex-grow text-center">Contact</h2>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white text-2xl leading-none absolute top-4 right-4">
                <FaTimes />
              </button>
            </div>
            <div className="text-gray-300 space-y-4">
              <p>For questions, support or other issues, please contact us via email:</p>
              <div className="font-semibold text-purple-300 bg-purple-500/10 p-3 rounded-lg border border-purple-500/20 break-all">
                daliobot@gmail.com
              </div>
            </div>
            <div className="mt-6">
              <button onClick={() => setActiveModal(null)} className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold w-full">Close</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* COOKIE CONSENT */}
      {showCookieConsent && (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-[100] p-4 bg-slate-900/95 border-t border-slate-700 backdrop-blur-md text-white shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
        >
          <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-300 text-center md:text-left">
              We use cookies to improve your experience. By continuing to use our website, you agree to our <button onClick={() => setActiveModal('privacy')} className="underline font-semibold text-purple-400 hover:text-purple-300">Privacy Policy</button>.
            </p>
            <button onClick={handleAcceptCookies} className="w-full md:w-auto flex-shrink-0 bg-purple-600 text-white text-sm font-semibold px-8 py-3 rounded-lg hover:bg-purple-700 hover:shadow-[0_0_15px_rgba(192,132,252,0.4)] transition-all">
              Got it!
            </button>
          </div>
        </motion.div>
      )}

    </div>
  );
}