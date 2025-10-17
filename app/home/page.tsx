
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaUserPlus, FaLink, FaChartPie, FaTimes, FaStar } from 'react-icons/fa';
import React, { useState, useRef, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { useAuth } from '@/src/context/authcontext';
import { useRouter } from 'next/navigation';

// --- Componente Reutilível para Animações de Seção ---
function AnimatedSection({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px 0px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      // CORREÇÃO: Substituída a curva cubic-bezier inválida por uma válida e de alta qualidade (easeOutQuint).
      transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}

// --- Componente principal da página ---
export default function HomePage() {
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const [showCookieConsent, setShowCookieConsent] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('daliobot_cookie_consent');
    if (consent !== 'accepted') {
      setShowCookieConsent(true);
    }
  }, []);

  const handleAcceptCookies = () => {
    localStorage.setItem('daliobot_cookie_consent', 'accepted');
    setShowCookieConsent(false);
  };
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  } as const;

  const letterVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', damping: 12, stiffness: 200 }
    },
  } as const;
  
  const heroTitle = "DalioBot BETA";

  const Modal = ({ children, closeModal }: { children: React.ReactNode, closeModal: () => void }) => (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div 
        className="bg-slate-800 border border-slate-700 p-6 rounded-lg shadow-2xl shadow-purple-900/20 max-w-3xl w-full max-h-[90vh] flex flex-col"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </div>
  );

  return (
    <div className="bg-slate-900 text-gray-200 antialiased overflow-x-hidden">
      
      {/* HEADER */}
      <header className="bg-slate-900/70 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-lg">
        <div className="container mx-auto px-4 flex justify-between items-center py-4">
          <Link href="/" className="text-2xl font-extrabold">
            <span className="text-white">Dalio</span>
            <span className="text-purple-400">bot</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="#recursos" className="text-sm font-medium text-gray-300 hover:text-purple-400 transition-colors">
              Features
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold text-purple-400 border border-purple-400 px-4 py-1.5 rounded-lg hover:bg-purple-400/10 hover:shadow-[0_0_15px_rgba(192,132,252,0.4)] transition-all duration-300"
            >
              Login
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="relative text-white py-24 md:py-32 overflow-hidden">
          {/* Fundo com gradiente e efeito aurora */}
          <div className="absolute inset-0 z-0">
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/30 rounded-full filter blur-3xl opacity-50 animate-blob"></div>
              <div className="absolute top-20 right-1/4 w-96 h-96 bg-fuchsia-600/30 rounded-full filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
          </div>
          
          <div className="container mx-auto px-4 grid md:grid-cols-2 gap-16 items-center relative z-10">
            <motion.div
              className="text-center md:text-left"
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              <motion.h1 
                className="text-4xl md:text-6xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400"
                variants={containerVariants}
              >
                {heroTitle.split("").map((char, index) => (
                  <motion.span key={index} variants={letterVariants}>
                    {char}
                  </motion.span>
                ))}
              </motion.h1>
              <motion.p className="text-lg text-gray-300 mt-6 max-w-md mx-auto md:mx-0" variants={letterVariants}>
                Stop guessing and start analyzing. Get free and complete access to our advanced analysis tools for 1 month!
              </motion.p>
              <motion.div variants={letterVariants}>
                <Link 
                  href="/login" 
                  className="mt-10 inline-block bg-purple-600 text-white font-bold px-8 py-4 rounded-lg 
                             transition-all duration-300 ease-in-out
                             hover:bg-purple-700 hover:scale-105
                             shadow-[0_0_20px_theme(colors.purple.500/60)]
                             hover:shadow-[0_0_35px_theme(colors.purple.500/80)]
                             animate-pulse-slow"
                >
                  Start Your Free Beta Trial
                </Link>
                 <p className="text-xs text-gray-400 mt-3">No credit card required.</p>
              </motion.div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="p-2 bg-white/10 rounded-xl shadow-2xl backdrop-blur-sm border border-white/10">
                <Image
                  src="/grafico de rentabilidade.png"
                  alt="Daliobot Performance Dashboard"
                  width={600}
                  height={450}
                  // CORREÇÃO: Adicionado w-full e h-auto para manter a proporção da imagem
                  className="rounded-lg w-full h-auto"
                  priority
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* FEATURE SECTIONS */}
        <section id="recursos" className="py-14 relative overflow-hidden">
          <AnimatedSection>
            <div className="container mx-auto px-4 grid md:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-fuchsia-400">Total control over your portfolio</h2>
                <p className="text-lg text-gray-400 mt-4">View all your assets, from different brokerages, in one place. Track profitability, equity growth, and diversification with intuitive charts.</p>
                <Link href="/login" className="mt-6 inline-block text-purple-400 font-semibold hover:text-purple-300 transition-colors">I want to master my projections &rarr;</Link>
              </div>
              <div className="p-1 bg-gradient-to-br from-purple-500/50 to-fuchsia-500/50 rounded-xl shadow-lg">
                {/* CORREÇÃO: Adicionado w-full e h-auto para manter a proporção da imagem */}
                <Image src="/grafico de rentabilidade2.png" alt="Profitability Chart" width={500} height={350} className="rounded-lg w-full h-auto" />
              </div>
            </div>
          </AnimatedSection>
        </section>

        <section className="py-24 bg-slate-900/50 relative overflow-hidden">
         {/* Efeito Aurora */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60rem] h-[60rem] bg-purple-600/20 rounded-full filter blur-3xl opacity-40"></div>
          <AnimatedSection className="relative z-10">
            <div className="container mx-auto px-4 grid md:grid-cols-2 gap-16 items-center">
              <div className="md:order-2">
                <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-fuchsia-400">Plan your future with more confidence</h2>
                <p className="text-lg text-gray-400 mt-4">Our powerful Monte Carlo Simulation tool runs thousands of projections for your strategies. Discover the real probability of reaching your financial goals and understand the risks.</p>
                <Link href="/login" className="mt-6 inline-block text-purple-400 font-semibold hover:text-purple-300 transition-colors">I want to prepare for any scenario &rarr;</Link>
              </div>
              <div className="md:order-1 p-1 bg-gradient-to-bl from-purple-500/50 to-fuchsia-500/50 rounded-xl shadow-lg">
                {/* CORREÇÃO: Adicionado w-full e h-auto para manter a proporção da imagem */}
                <Image src="/montecarlo.png" alt="Monte Carlo Simulation" width={500} height={350} className="rounded-lg w-full h-auto" />
              </div>
            </div>
          </AnimatedSection>
        </section>
        
        {/* HOW IT WORKS SECTION */}
        <section className="py-24">
          <div className="container mx-auto px-4 text-center">
            <AnimatedSection>
              <h2 className="text-3xl md:text-4xl font-bold text-white">Get started in just 3 steps</h2>
            </AnimatedSection>
            <motion.div
              className="mt-16 grid md:grid-cols-3 gap-10"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
            >
              {[
                { icon: FaUserPlus, title: "1. Sign Up", text: "Create your account quickly and get instant access to DalioBot Beta." },
                { icon: FaLink, title: "2. Upload your backtests", text: "Upload your results in .csv format. Our platform reads and organizes everything for you." },
                { icon: FaChartPie, title: "3. Discover your potential", text: "Turn raw data into powerful analyses and insights to optimize your strategies." }
              ].map((item, index) => (
                <motion.div key={index} variants={letterVariants} className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 hover:border-purple-500/50 transition-colors duration-300">
                  <div className="relative inline-block">
                    <div className="absolute -inset-2 bg-purple-500/50 rounded-full blur-xl"></div>
                    <item.icon className="relative text-5xl text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold mt-6 text-white">{item.title}</h3>
                  <p className="text-gray-400 mt-2">{item.text}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* TESTIMONIALS SECTION */}
        <section className="py-24 bg-gradient-to-b from-purple-900/40 to-slate-900">
          <div className="container mx-auto px-4">
            <AnimatedSection>
              <h2 className="text-3xl md:text-4xl font-bold text-center text-white">Loved by investors worldwide</h2>
            </AnimatedSection>
            <motion.div
              className="mt-16 grid md:grid-cols-3 gap-8"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {[
                { name: "James S.", role: "Individual Investor", text: "Finally a tool that unifies everything! Daliobot saves me hours every week.", img: "/James.jpg" },
                { name: "Lukas M.", role: "Software Engineer", text: "The interface is beautiful and super intuitive. It feels like it was made for normal people, not experts.", img: "/LukasM.jpg" },
                { name: "Antoine D.", role: "Freelancer", text: "The risk analysis feature is fantastic. It helped me rebalance my portfolio and sleep more soundly.", img: "/Antoine.jpg" }
              ].map((testimonial, index) => (
                <motion.div key={index} variants={letterVariants} className="bg-slate-800/60 p-6 rounded-xl backdrop-blur-sm border border-slate-700 flex flex-col h-full">
                  <div className="flex text-yellow-400 mb-3">
                    {[...Array(5)].map((_, i) => <FaStar key={i} />)}
                  </div>
                  <p className="italic text-gray-300 flex-grow">"{testimonial.text}"</p>
                  <div className="flex items-center mt-6 pt-4 border-t border-slate-700">
                    {/* CORREÇÃO: Adicionado object-cover para evitar distorção em imagens não-quadradas */}
                    <Image src={testimonial.img} width={40} height={40} alt={testimonial.name} className="rounded-full object-cover" />
                    <div className="ml-4">
                      <p className="font-bold text-white">{testimonial.name}</p>
                      <p className="text-sm text-gray-400">{testimonial.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* FINAL CTA SECTION */}
        <section id="beta-cta" className="py-24">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <h2 className="text-3xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400">Ready to take your trading to the next level?</h2>
            <p className="mt-6 text-lg text-gray-300">
              Join the DalioBot Beta today and get **1 month of free access** to all our premium features. No credit card required.
            </p>
            <Link 
              href="/login" 
              className="mt-10 inline-block bg-purple-600 text-white font-bold px-10 py-4 rounded-lg 
                         transition-all duration-300 ease-in-out
                         hover:bg-purple-700 hover:scale-105
                         shadow-[0_0_20px_theme(colors.purple.500/60)]
                         hover:shadow-[0_0_40px_theme(colors.purple.500)]
                         text-lg"
            >
              Start Your Free Trial Now!
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900/50 border-t border-slate-800">
        <div className="container mx-auto px-4 py-16 grid md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <h3 className="text-xl font-extrabold text-white">Dalio<span className="text-purple-400">bot</span></h3>
            <p className="text-gray-400 mt-4 text-sm">Automating the financial market so you can focus on what really matters.</p>
          </div>
          <div>
            <h4 className="font-bold text-white">Product</h4>
            <ul className="mt-4 space-y-2">
              <li><Link href="#recursos" className="text-gray-400 hover:text-purple-400 text-sm">Features</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white">Company</h4>
            <ul className="mt-4 space-y-2">
              <li><button onClick={() => setIsContactModalOpen(true)} className="text-gray-400 hover:text-purple-400 text-sm text-left hover:underline">Contact</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white">Legal</h4>
            <ul className="mt-4 space-y-2">
              <li><button onClick={() => setIsTermsModalOpen(true)} className="text-gray-400 hover:text-purple-400 text-sm text-left hover:underline">Terms of Service</button></li>
              <li><button onClick={() => setIsPrivacyModalOpen(true)} className="text-gray-400 hover:text-purple-400 text-sm text-left hover:underline">Privacy Policy</button></li>
              <li><button onClick={() => setIsRefundModalOpen(true)} className="text-gray-400 hover:text-purple-400 text-sm text-left hover:underline">Refund Policy</button></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 text-center py-6">
          <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} Daliobot. All rights reserved.</p>
        </div>
      </footer>
      
      {/* MODALS & POPUPS */}
      {isTermsModalOpen && (
        <Modal closeModal={() => setIsTermsModalOpen(false)}>
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
              <h2 className="text-xl font-bold text-white">Terms of Service</h2>
              <button onClick={() => setIsTermsModalOpen(false)} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
            </div>
            <div className="text-sm text-gray-300 space-y-4 overflow-y-auto pr-2">
              <p>Please carefully read the terms and conditions set out below (“Terms of Use”) so that you can enjoy our platform and all the services available through it, all of which are the exclusive property of the website www.daliobot.com.br. By using the platform, our products and/or services, including our content made available through the Platform, you are agreeing to these Terms of Use. If you do not agree, we ask that you do not use our products and/or services, as your use represents your full acceptance of these Terms of Use.</p>
              <p>Tolerance regarding the non-compliance with any obligation set forth in the Platform's Terms of Use will not signify a waiver of the right to demand compliance with the obligation, nor an alteration of any term or condition contained herein.</p>
              <p>For a better experience for its Users, DalioBot may, from time to time, partially or fully change the Terms of Use. But, of course: in the event of a change, you will be informed when you access the platform again, whether logged in or not, and the user will be required to accept the Terms of Use again. In the specific case of processing personal data or sensitive data, you will be fully informed about any and all actions taken in this regard, providing prior consent whenever necessary. If you do not agree with the changes we have made, you can cancel your account and cease any and all use of the products and services.</p>
              <ol className="list-decimal list-inside space-y-3 mt-4 pl-2 text-gray-400">
                <li>The history of profitability or analysis is not a guarantee of future returns. The variable income market involves risks and is subject to various eventualities and external effects that involve unpredictability and, thus, financial risks. Furthermore, results may vary from person to person, according to the operations carried out by each individual.</li>
                <li>The "DalioBot" website is not responsible for any type of financial transaction between the user and the developer/company that is marketing the robot. We only connect investors and validated automated strategies. The entire hiring process is done directly between the person responsible for the strategy and the user.</li>
                <li>The statistical data of all robots are provided directly by the developer. Therefore, the accuracy of the information is their sole responsibility.</li>
                <li>By registering a robot, you agree that the data contained in the import CSV has not been manipulated.</li>
                <li>The site offers no warranty linked to the Platform, and its use, and is not responsible for any damages or losses resulting from its use. The use of the Platform and the disclosed robots is the sole responsibility of the user, who must use their own knowledge and techniques to decide on their investments.</li>
              </ol>
              <p className="font-semibold text-white">Using the Beta Version:</p>
              <p>This version of the platform is a free beta, offered for a limited time to test its features. All features are provided "as is" and may contain bugs or be subject to changes. The DalioBot website is not responsible, under any circumstances, for any damage or loss, material or moral, related to the use of the platform during the beta period.</p>
              <p>The "Payment Processing" and pricing sections are not applicable to the Beta Version. However, please read our general terms of use, as they apply to the use of all our services.</p>
            </div>
            <div className="mt-6 text-right border-t border-slate-700 pt-4">
              <button onClick={() => setIsTermsModalOpen(false)} className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold">Close</button>
            </div>
        </Modal>
      )}

      {isPrivacyModalOpen && (
        <Modal closeModal={() => setIsPrivacyModalOpen(false)}>
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
              <h2 className="text-xl font-bold text-white">Privacy Policy</h2>
              <button onClick={() => setIsPrivacyModalOpen(false)} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
            </div>
            <div className="text-sm text-gray-300 space-y-4 overflow-y-auto pr-2">
                <p>Welcome to DalioBot! Your privacy is critically important to us. This Privacy Policy outlines how we collect, use, store, share, and protect your information when you use our platform.</p>
                <h3 className="text-md font-semibold text-white pt-2">1. Data We Collect</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Account Information:</strong> When you register, we collect your name, email address, and a hashed password.</li>
                  <li><strong>Backtest and Portfolio Data:</strong> We store all data from your uploaded .csv files and the portfolios you create. This sensitive data is used solely to provide you with analysis within your account and is never shared.</li>
                  <li><strong>Usage Data:</strong> We automatically collect technical and usage data to improve our service.</li>
                </ul>
                <h3 className="text-md font-semibold text-white pt-2">2. How We Use Your Data</h3>
                <p>We use your data to provide and maintain the service, improve the platform, communicate with you, ensure security, and process payments.</p>
                <h3 className="text-md font-semibold text-white pt-2">3. Data Sharing</h3>
                <p>We do not sell your personal information. We only share data with essential partners for platform operation, such as cloud infrastructure providers (Firebase/Google Cloud) and payment processors, under strict confidentiality agreements.</p>
                <h3 className="text-md font-semibold text-white pt-2">4. Your Rights</h3>
                <p>In accordance with data protection laws like LGPD, you have the right to access, correct, delete, or transfer your data, and revoke consent. To exercise your rights, please contact us.</p>
                <h3 className="text-md font-semibold text-white pt-2">5. Contact Us</h3>
                <p>If you have any questions about this Privacy Policy, please contact us at: <span className="font-medium text-purple-400">daliobotcontact@gmail.com</span></p>
            </div>
            <div className="mt-6 text-right border-t border-slate-700 pt-4">
              <button onClick={() => setIsPrivacyModalOpen(false)} className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold">Close</button>
            </div>
        </Modal>
      )}

      {isRefundModalOpen && (
        <Modal closeModal={() => setIsRefundModalOpen(false)}>
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
              <h2 className="text-xl font-bold text-white">Refund Policy</h2>
              <button onClick={() => setIsRefundModalOpen(false)} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
            </div>
            <div className="text-sm text-gray-300 space-y-4 overflow-y-auto pr-2">
                <p>At DalioBot, we want you to be completely satisfied with your purchase. We offer a 14-day money-back guarantee for all our plans.</p>
                <p>If for any reason you are not satisfied with our service within the first 14 days of your initial subscription (monthly or annual), please contact us at <span className="font-medium text-purple-400">daliobotcontact@gmail.com</span> to request a full refund.</p>
                <p>For the "Founder's Pack" (Lifetime Subscription), the period for a refund request is also 14 days from the date of purchase.</p>
                <p>Please note that refunds are processed through our payment partner, Paddle.com, and may take 5-10 business days to appear on your statement.</p>
            </div>
            <div className="mt-6 text-right border-t border-slate-700 pt-4">
              <button onClick={() => setIsRefundModalOpen(false)} className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold">Close</button>
            </div>
        </Modal>
      )}
      
      {isContactModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div 
            className="bg-slate-800 border border-slate-700 p-8 rounded-lg shadow-2xl shadow-purple-900/20 max-w-sm w-full text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white flex-grow text-center">Contact</h2>
              <button onClick={() => setIsContactModalOpen(false)} className="text-gray-400 hover:text-white text-3xl leading-none -mt-4 -mr-2">&times;</button>
            </div>
            <div className="text-gray-300 space-y-4">
              <p>For questions, support or other issues, please contact us via email:</p>
              <p className="font-semibold text-purple-300 bg-purple-500/10 p-3 rounded-lg border border-purple-500/20">
                daliobotcontact@gmail.com
              </p>
            </div>
            <div className="mt-6">
              <button onClick={() => setIsContactModalOpen(false)} className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold w-full">Close</button>
            </div>
          </motion.div>
        </div>
      )}
      
      {showCookieConsent && (
        <motion.div 
            className="fixed inset-x-0 bottom-0 z-[100] p-4 bg-slate-800/80 border-t border-slate-700 backdrop-blur-sm text-white shadow-lg"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
        >
          <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-300">
              We use cookies to improve your experience. By continuing to use our website, you agree to our <button onClick={() => setIsPrivacyModalOpen(true)} className="underline font-semibold hover:text-purple-400">Privacy Policy</button>.
            </p>
            <button onClick={handleAcceptCookies} className="w-full md:w-auto flex-shrink-0 bg-purple-600 text-white text-sm font-semibold px-6 py-2 rounded-md hover:bg-purple-700 transition-colors">
              Got it!
            </button>
          </div>
        </motion.div>
      )}

    </div>
  );
}
