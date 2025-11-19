'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaUserPlus, FaLink, FaChartPie, FaStar, FaCheckCircle, FaArrowRight, FaShieldAlt, FaBolt, FaTimes } from 'react-icons/fa';
import React, { useState, useRef, useEffect } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { useAuth } from '@/src/context/authcontext';
import { useRouter } from 'next/navigation';

// --- Componentes de UI Reutilizáveis ---

const SectionBadge = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-center px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-medium uppercase tracking-wider mb-4">
    {children}
  </div>
);

const BrowserFrame = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`rounded-xl overflow-hidden border border-slate-700/50 bg-slate-800/50 shadow-2xl shadow-purple-900/20 backdrop-blur-sm ${className}`}>
    <div className="bg-slate-900/80 border-b border-slate-700/50 px-4 py-3 flex items-center gap-2">
      <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
      <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
      <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
      <div className="ml-4 px-3 py-1 bg-slate-800 rounded-md text-[10px] text-slate-500 w-full max-w-[200px] hidden sm:block"></div>
    </div>
    <div className="relative">
      {children}
    </div>
  </div>
);

function AnimatedSection({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px 0px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}

// --- Modal Genérico Moderno ---
const Modal = ({ title, children, closeModal }: { title: string, children: React.ReactNode, closeModal: () => void }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={closeModal}
    />
    <motion.div
      className="bg-slate-900 border border-slate-700 w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl shadow-purple-900/40 relative z-10 overflow-hidden"
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <button onClick={closeModal} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
          <FaTimes />
        </button>
      </div>

      {/* Conteúdo com Scroll Customizado */}
      <div className="p-6 overflow-y-auto custom-scrollbar text-slate-300 space-y-4 leading-relaxed text-sm">
        {children}
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
        <button onClick={closeModal} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-purple-900/20">
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

  // Efeito de paralaxe/fade no header
  const headerOpacity = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

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
    <div className="bg-slate-950 text-slate-200 selection:bg-purple-500/30 selection:text-purple-200 font-sans antialiased overflow-x-hidden">

      {/* Background Grid Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="absolute top-0 left-0 right-0 h-[500px] bg-purple-500/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none"></div>
      </div>

      {/* HEADER */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-xl bg-slate-950/60 supports-[backdrop-filter]:bg-slate-950/30"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-4 h-20 flex justify-between items-center">
          <Link href="/" className="text-2xl font-extrabold tracking-tight relative group">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 group-hover:to-white transition-all duration-300">Dalio</span>
            <span className="text-purple-500 group-hover:text-purple-400 transition-colors">bot</span>
            <span className="absolute -top-1 -right-3 w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
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
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-500 transition-all group-hover:w-full"></span>
            </button>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Login
            </Link>
            <Link
              href="/login"
              className="group relative inline-flex items-center justify-center px-5 py-2 text-sm font-semibold text-white transition-all duration-200 bg-purple-600 rounded-lg hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-600 focus:ring-offset-slate-900 overflow-hidden"
            >
              <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
              <span className="relative flex items-center gap-2">
                Start Free Beta <FaArrowRight className="text-xs group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </div>
        </div>
      </motion.header>

      <main className="relative z-10 pt-20">

        {/* HERO SECTION */}
        <section className="relative pt-20 pb-10 lg:pt-32 lg:pb-12 overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-16">

              {/* Hero Content */}
              <motion.div
                className="flex-1 text-center lg:text-left"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <SectionBadge>Public Beta 1.0</SectionBadge>
                <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
                  Stop guessing. <br />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-400 animate-gradient-x">
                    Start Analyzing.
                  </span>
                </h1>
                <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto lg:mx-0 mb-10">
                  Professional-grade backtesting analysis and portfolio simulations, simplified for individual investors. Get <span className="text-purple-400 font-semibold">1 month free access</span> during our beta.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                  <Link
                    href="/login"
                    className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 rounded-xl font-bold text-lg hover:bg-slate-100 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-15px_rgba(192,132,252,0.5)] hover:-translate-y-1 flex items-center justify-center gap-2"
                  >
                    Get Started Free
                  </Link>
                  <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="w-full sm:w-auto px-8 py-4 bg-slate-800 text-white rounded-xl font-bold text-lg border border-slate-700 hover:border-purple-500/50 hover:bg-slate-800/80 transition-all flex items-center justify-center gap-2">
                    View Features
                  </button>
                </div>

                <div className="mt-8 flex items-center justify-center lg:justify-start gap-6 text-sm text-slate-500">
                  <span className="flex items-center gap-2"><FaCheckCircle className="text-purple-500" /> No credit card required</span>
                </div>
              </motion.div>

              {/* Hero Visual */}
              <motion.div
                className="flex-1 w-full max-w-[600px] lg:max-w-none perspective-1000"
                initial={{ opacity: 0, rotateX: 10, y: 50 }}
                animate={{ opacity: 1, rotateX: 0, y: 0 }}
                transition={{ duration: 1, delay: 0.2, type: "spring" }}
              >
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-2xl blur opacity-30 animate-pulse-slow"></div>

                  <BrowserFrame className="relative bg-slate-900 w-full max-w-[800px] mx-auto shadow-2xl group">
                    <Image
                      src="/dashboard.png"
                      alt="Daliobot Dashboard"
                      width={1200} // Largura base de alta resolução
                      height={900} // Altura base (proporção 4:3)
                      className="w-full h-auto object-cover object-top transition-transform duration-700 group-hover:scale-105 block"
                      priority
                    />
                    {/* Gradiente Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-20 pointer-events-none"></div>
                  </BrowserFrame>

                  <motion.div
                    className="absolute -bottom-6 -left-6 bg-slate-800/90 backdrop-blur-md p-4 rounded-lg border border-slate-700 shadow-xl"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/20 rounded-full text-green-400"><FaChartPie /></div>
                      <div>
                        <p className="text-xs text-slate-400">Productivity</p>
                        <p className="text-lg font-bold text-white">High</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    className="absolute -top-6 -right-6 bg-slate-800/90 backdrop-blur-md p-4 rounded-lg border border-slate-700 shadow-xl"
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/20 rounded-full text-purple-400"><FaBolt /></div>
                      <div>
                        <p className="text-xs text-slate-400">Efficiency</p>
                        <p className="text-lg font-bold text-white">High</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION - ZIG ZAG */}
        <section id="features" className="py-24 relative">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Unfair Advantage</h2>
              <p className="text-lg text-slate-400">
                Most retail traders fly blind. DalioBot gives you the institutional-grade cockpit you need to navigate the markets safely.
              </p>
            </div>

            <div className="space-y-32">
              {/* Feature 1 */}
              <AnimatedSection>
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div className="order-2 md:order-1">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-6 border border-purple-500/20">
                      <FaChartPie className="text-2xl text-purple-400" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-4">Unified Portfolio Command</h3>
                    <p className="text-slate-400 text-lg leading-relaxed mb-6">
                      Stop switching between 5 different broker tabs. View all your assets, cross-reference performance, and track true equity growth in one centralized, beautiful dashboard.
                    </p>
                    <ul className="space-y-3 mb-8">
                      {['Multi-broker integration', 'Real-time equity tracking', 'Diversification metrics'].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-slate-300">
                          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div> {item}
                        </li>
                      ))}
                    </ul>
                    <Link href="/login" className="text-purple-400 font-semibold hover:text-purple-300 flex items-center gap-2 group">
                      Master your data <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </Link>
                  </div>
                  <div className="order-1 md:order-2 relative group">
                    <div className="absolute -inset-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-xl blur-xl group-hover:opacity-100 transition duration-500 opacity-0"></div>
                    <BrowserFrame>
                      <Image src="/dashboard2.png" alt="Portfolio" width={600} height={400} className="w-full h-auto" />
                    </BrowserFrame>
                  </div>
                </div>
              </AnimatedSection>

              {/* Feature 2 */}
              <AnimatedSection>
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div className="relative group">
                    <div className="absolute -inset-2 bg-gradient-to-r from-fuchsia-600/20 to-purple-600/20 rounded-xl blur-xl group-hover:opacity-100 transition duration-500 opacity-0"></div>
                    <BrowserFrame>
                      <Image src="/montecarlosim.png" alt="Monte Carlo" width={600} height={400} className="w-full h-auto" style={{ backgroundColor: '#0f172a' }} />
                    </BrowserFrame>
                  </div>
                  <div>
                    <div className="w-12 h-12 bg-fuchsia-500/10 rounded-lg flex items-center justify-center mb-6 border border-fuchsia-500/20">
                      <FaShieldAlt className="text-2xl text-fuchsia-400" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-4">Monte Carlo Simulations</h3>
                    <p className="text-slate-400 text-lg leading-relaxed mb-6">
                      Don't trust a single backtest. Our engine runs thousands of probabilistic scenarios to show you the "Worst Case" and "Best Case" reality. Understand your risk of ruin before you risk a dollar.
                    </p>
                    <ul className="space-y-3 mb-8">
                      {['10,000+ Iterations', 'Risk of Ruin Calculation', 'Confidence Intervals'].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-slate-300">
                          <div className="w-1.5 h-1.5 bg-fuchsia-500 rounded-full"></div> {item}
                        </li>
                      ))}
                    </ul>
                    <Link href="/login" className="text-fuchsia-400 font-semibold hover:text-fuchsia-300 flex items-center gap-2 group">
                      Simulate future <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </Link>
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* STEPS SECTION */}
        <section className="py-24 bg-slate-900/50 border-y border-white/5">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white">How it works</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: FaUserPlus, title: "1. Sign Up", desc: "Create your free account in seconds. No complicated KYC for the beta." },
                { icon: FaLink, title: "2. Upload HTML", desc: "Export your backtest or history from MT5/cTrader and drag & drop it here." },
                { icon: FaChartPie, title: "3. Analyze", desc: "Instantly get a generated report with actionable insights and optimization tips." }
              ].map((step, i) => (
                <AnimatedSection key={i} delay={i * 0.2} className="group h-full">
                  <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700/50 hover:bg-slate-800 transition-colors h-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors"></div>
                    <step.icon className="text-4xl text-purple-400 mb-6 group-hover:scale-110 transition-transform duration-300" />
                    <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                    <p className="text-slate-400">{step.desc}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section id="testimonials" className="py-24 overflow-hidden">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-16">Loved by early adopters</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { name: "James S.", role: "Individual Investor", text: "Finally a tool that unifies everything! Daliobot saves me hours every week.", img: "/James.jpg" },
                { name: "Lukas M.", role: "Software Engineer", text: "The UI is incredibly clean. It takes complex data and makes it understandable for non-quants.", img: "/LukasM.jpg" },
                { name: "Antoine D.", role: "Pro Trader", text: "The risk analysis feature (Monte Carlo) saved me from a strategy that looked good but was actually dangerous.", img: "/Antoine.jpg" }
              ].map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-gradient-to-b from-slate-800 to-slate-900 p-8 rounded-2xl border border-slate-700 relative"
                >
                  <div className="absolute top-4 right-8 text-6xl text-purple-500/10 font-serif">"</div>

                  <div className="flex text-yellow-400 mb-4 text-sm gap-1">
                    {[...Array(5)].map((_, i) => <FaStar key={i} />)}
                  </div>
                  <p className="text-slate-300 italic mb-6 relative z-10">"{t.text}"</p>
                  <div className="flex items-center gap-4 mt-auto">
                    <div className="w-10 h-10 rounded-full bg-slate-700 relative overflow-hidden">
                      <Image src={t.img} alt={t.name} fill className="object-cover" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">{t.name}</p>
                      <p className="text-slate-500 text-xs">{t.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-purple-900/20"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950"></div>

          <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tight">
              Ready to professionalize your trading?
            </h2>
            <p className="text-xl text-slate-400 mb-10">
              Join the Beta today. 100% Free for the first month. <br className="hidden md:block" />No commitments, cancel anytime.
            </p>
            <Link
              href="/login"
              className="inline-block px-10 py-5 bg-white text-slate-900 font-bold text-xl rounded-xl hover:scale-105 transition-transform duration-300 shadow-[0_0_50px_rgba(255,255,255,0.3)]"
            >
              Start Free Trial Now
            </Link>
            <p className="mt-6 text-slate-600 text-sm">Limited spots available for Beta access.</p>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-800 py-16 text-sm">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <Link href="/" className="text-xl font-extrabold text-white mb-4 block">Dalio<span className="text-purple-500">bot</span></Link>
              <p className="text-slate-500">
                Automating the financial market so you can focus on what really matters.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="#features" className="hover:text-purple-400 transition-colors">Features</Link></li>
                <li><Link href="/login" className="hover:text-purple-400 transition-colors">Login</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400">
                <li><button onClick={() => setActiveModal('terms')} className="hover:text-purple-400 transition-colors text-left">Terms of Service</button></li>
                <li><button onClick={() => setActiveModal('privacy')} className="hover:text-purple-400 transition-colors text-left">Privacy Policy</button></li>
                <li><button onClick={() => setActiveModal('refund')} className="hover:text-purple-400 transition-colors text-left">Refund Policy</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400">
                <li><button onClick={() => setActiveModal('contact')} className="hover:text-purple-400 transition-colors">Contact</button></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 text-center text-slate-600">
            &copy; {new Date().getFullYear()} Daliobot. All rights reserved.
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