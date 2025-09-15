'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaUserPlus, FaLink, FaChartPie, FaCheck, FaTimes } from 'react-icons/fa';
import React, { useState, useRef, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { useAuth } from '@/src/context/authcontext';
import { useRouter } from 'next/navigation';
// REMOVIDO: import { PADDLE_PRICE_IDS, openPaddleCheckout } from '@/src/utils/paddleUtils';
// REMOVIDO: import Script from 'next/script'; // Script do Paddle


// --- Componente Reutilizável para Animações de Seção ---
function AnimatedSection({ children }: { children: React.ReactNode }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: "easeOut" }}
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
  // REMOVIDO: const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const { user } = useAuth();
  const router = useRouter();
  const [showCookieConsent, setShowCookieConsent] = useState(false);

  const handleAcceptCookies = () => {
    localStorage.setItem('daliobot_cookie_consent', 'accepted');
    setShowCookieConsent(false);
  };
  
  // Variantes de animação para stagger (escalonamento)
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };
  // REMOVIDO: const [isPaddleReady, setIsPaddleReady] = useState(false); // Não é mais necessário

  useEffect(() => {
    const consent = localStorage.getItem('daliobot_cookie_consent');
    if (consent !== 'accepted') {
      setShowCookieConsent(true);
    }
  }, []);

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: "easeOut" }
    },
  };

  const CheckIcon = () => (
    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
    </svg>
  );

  const CloseIcon = () => (
    <FaTimes className="flex-shrink-0 w-5 h-5 text-red-400" />
  );


  return (
    <div className="bg-white">
      {/* Script do Paddle.js REMOVIDO */}

      {/* HEADER */}
      <header className="bg-white/80 border-b border-gray-200 sticky top-0 z-40 backdrop-blur-sm">
        <div className="container mx-auto px-4 flex justify-between items-center py-4">
          <Link href="/" className="text-2xl font-extrabold text-purple-600">
            <span className="text-gray-900">Dalio</span>
            <span>bot</span>
          </Link>
          <nav className="flex items-center space-x-6">
            <Link href="#recursos" className="text-sm font-medium text-gray-600 hover:text-purple-600 transition-colors">
              Features
            </Link>
            {/* REMOVIDO: Link de Preços */}
            <Link
              href="/login"
              className="text-sm font-semibold text-purple-600 border-2 border-purple-600 px-4 py-1.5 rounded-lg hover:bg-purple-600 hover:text-white transition-colors duration-200"
            >
              Login
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="bg-purple-600 text-white py-20 overflow-hidden">
          <div className="container mx-auto px-4 grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              className="text-center md:text-left"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
                DalioBot BETA
              </motion.h1>
              <motion.p className="text-lg text-white/80 mt-4 max-w-md mx-auto md:mx-0">
                Stop guessing and start analyzing. Get free and complete access to our advanced analysis tools for 1 month!
              </motion.p>
              <motion.div>
                <Link href="/login" className="mt-8 inline-block bg-white text-purple-600 font-bold px-8 py-4 rounded-lg hover:bg-gray-200 transition-transform hover:scale-105">
                  Start Your Free Beta Trial
                </Link>
              </motion.div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            >
              <Image
                src="/grafico de rentabilidade.png"
                alt="Daliobot Performance Dashboard"
                width={600}
                height={450}
                className="rounded-xl shadow-2xl mx-auto"
                priority
              />
            </motion.div>
          </div>
        </section>

        {/* FEATURE SECTIONS */}
        <section id="recursos" className="py-20 bg-white">
          <AnimatedSection>
            <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-800">Total control over your portfolio</h2>
                <p className="text-lg text-gray-600 mt-4">View all your assets, from different brokerages, in one place. Track profitability, equity growth, and diversification with intuitive charts.</p>
                <Link href="/login" className="mt-6 inline-block text-purple-600 font-semibold hover:underline">I want to master my projections &rarr;</Link>
              </div>
              <div><Image src="/grafico de rentabilidade2.png" alt="Profitability Chart" width={500} height={350} className="rounded-xl shadow-lg mx-auto" /></div>
            </div>
          </AnimatedSection>
        </section>

        <section className="py-20 bg-gray-50">
          <AnimatedSection>
            <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
              <div className="md:order-2">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-800">Plan your future with more confidence</h2>
                <p className="text-lg text-gray-600 mt-4">Our powerful Monte Carlo Simulation tool runs thousands of projections for your strategies. Discover the real probability of reaching your financial goals and understand the risks.</p>
                <Link href="/login" className="mt-6 inline-block text-purple-600 font-semibold hover:underline">I want to prepare for any scenario &rarr;</Link>
              </div>
              <div className="md:order-1"><Image src="/montecarlo.png" alt="Monte Carlo Simulation" width={500} height={350} className="rounded-xl shadow-lg mx-auto" /></div>
            </div>
          </AnimatedSection>
        </section>

        {/* REMOVIDO: a seção de "Optimized Portfolio Builder" por não estar na beta */}
        
        {/* HOW IT WORKS SECTION */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4 text-center">
            <AnimatedSection>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800">Get started in just 3 steps</h2>
            </AnimatedSection>
            <motion.div
              className="mt-12 grid md:grid-cols-3 gap-10"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
            >
              <motion.div className="flex flex-col items-center">
                <FaUserPlus className="text-5xl text-purple-600" />
                <h3 className="text-xl font-bold mt-4 text-gray-800">1. Sign Up</h3>
                <p className="text-gray-600 mt-2">Create your account quickly and get instant access to DalioBot Beta.</p>
              </motion.div>
              <motion.div className="flex flex-col items-center">
                <FaLink className="text-5xl text-purple-600" />
                <h3 className="text-xl font-bold mt-4 text-gray-800">2. Upload your backtests</h3>
                <p className="text-gray-600 mt-2">Upload your results in .csv format. Our platform reads and organizes everything for you.</p>
              </motion.div>
              <motion.div className="flex flex-col items-center">
                <FaChartPie className="text-5xl text-purple-600" />
                <h3 className="text-xl font-bold mt-4 text-gray-800">3. Discover your potential</h3>
                <p className="text-gray-600 mt-2">Turn raw data into powerful analyses and insights to optimize your strategies.</p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* TESTIMONIALS SECTION */}
        <section className="py-20 bg-purple-600 text-white">
          <div className="container mx-auto px-4">
            <AnimatedSection>
              <h2 className="text-3xl md:text-4xl font-bold text-center">Loved by investors worldwide</h2>
            </AnimatedSection>
            <motion.div
              className="mt-12 grid md:grid-cols-3 gap-8"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              <motion.div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
                <p className="italic">"Finally a tool that unifies everything! Daliobot saves me hours every week."</p>
                <div className="flex items-center mt-4">
                  <Image src="/James.jpg" width={40} height={40} alt="James S." className="rounded-full" />
                  <div className="ml-4"> <p className="font-bold">James S.</p> <p className="text-sm opacity-80">Individual Investor</p> </div>
                </div>
              </motion.div>
              <motion.div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
                <p className="italic">"The interface is beautiful and super intuitive. It feels like it was made for normal people, not experts."</p>
                <div className="flex items-center mt-4">
                  <Image src="/LukasM.jpg" width={40} height={40} alt="Lukas M." className="rounded-full" />
                  <div className="ml-4"> <p className="font-bold">Lukas M.</p> <p className="text-sm opacity-80">Software Engineer</p> </div>
                </div>
              </motion.div>
              <motion.div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
                <p className="italic">"The risk analysis feature is fantastic. It helped me rebalance my portfolio and sleep more soundly."</p>
                <div className="flex items-center mt-4">
                  <Image src="/Antoine.jpg" width={40} height={40} alt="Antoine D." className="rounded-full" />
                  <div className="ml-4"> <p className="font-bold">Antoine D.</p> <p className="text-sm opacity-80">Freelancer</p> </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* NOVO: SEÇÃO DE CHAMADA PARA AÇÃO ÚNICA (SUBSTITUINDO A DE PREÇOS) */}
        <section id="beta-cta" className="py-20 bg-gray-50">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">Ready to take your trading to the next level?</h2>
            <p className="mt-4 text-lg text-gray-600">
              Join the DalioBot Beta today and get **1 month of free access** to all our premium features. No credit card required.
            </p>
            <Link href="/login" className="mt-8 inline-block bg-purple-600 text-white font-bold px-10 py-4 rounded-lg hover:bg-purple-700 transition-transform hover:scale-105 text-lg">
              Start Your Free Trial Now!
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-purple-600 text-white">
        <div className="container mx-auto px-4 py-16 grid md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <h3 className="text-xl font-extrabold text-white">Daliobot</h3>
            <p className="text-white/60 mt-4">Automating the financial market so you can focus on what really matters.</p>
          </div>
          <div>
            <h4 className="font-bold">Product</h4>
            <ul className="mt-4 space-y-2">
              <li><Link href="#recursos" className="text-white/60 hover:text-white">Features</Link></li>
              {/* REMOVIDO: Link de Preços */}
            </ul>
          </div>
          <div>
            <h4 className="font-bold">Company</h4>
            <ul className="mt-4 space-y-2">
              <li><button onClick={() => setIsContactModalOpen(true)} className="text-white/60 hover:text-white text-left hover:underline">Contact</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold">Legal</h4>
            <ul className="mt-4 space-y-2">
              <li><button onClick={() => setIsTermsModalOpen(true)} className="text-white/60 hover:text-white text-left hover:underline">Terms of Service</button></li>
              <li><button onClick={() => setIsPrivacyModalOpen(true)} className="text-white/60 hover:text-white text-left hover:underline">Privacy Policy</button></li>
              <li><button onClick={() => setIsRefundModalOpen(true)} className="text-white/60 hover:text-white text-left hover:underline">Refund Policy</button></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 text-center py-4">
          <p className="text-white/60 text-sm">&copy; {new Date().getFullYear()} Daliobot. All rights reserved.</p>
        </div>
      </footer>

      {/* ========================================================== */}
      {/* ================ POPUP DOS TERMOS DE SERVIÇO ================ */}
      {/* ========================================================== */}
      {isTermsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-xl font-bold text-gray-800">Terms of Service</h2>
              <button onClick={() => setIsTermsModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-3xl leading-none" aria-label="Fechar popup">&times;</button>
            </div>
            <div className="text-sm text-gray-600 space-y-4 overflow-y-auto pr-2">
              <p>Please carefully read the terms and conditions set out below (“Terms of Use”) so that you can enjoy our platform and all the services available through it, all of which are the exclusive property of the website www.daliobot.com.br. By using the platform, our products and/or services, including our content made available through the Platform, you are agreeing to these Terms of Use. If you do not agree, we ask that you do not use our products and/or services, as your use represents your full acceptance of these Terms of Use.</p>
              <p>Tolerance regarding the non-compliance with any obligation set forth in the Platform's Terms of Use will not signify a waiver of the right to demand compliance with the obligation, nor an alteration of any term or condition contained herein.</p>
              <p>For a better experience for its Users, DalioBot may, from time to time, partially or fully change the Terms of Use. But, of course: in the event of a change, you will be informed when you access the platform again, whether logged in or not, and the user will be required to accept the Terms of Use again. In the specific case of processing personal data or sensitive data, you will be fully informed about any and all actions taken in this regard, providing prior consent whenever necessary. If you do not agree with the changes we have made, you can cancel your account and cease any and all use of the products and services.</p>
              <ol className="list-decimal list-inside space-y-3 mt-4 pl-2 text-gray-700">
                <li>The history of profitability or analysis is not a guarantee of future returns. The variable income market involves risks and is subject to various eventualities and external effects that involve unpredictability and, thus, financial risks. Furthermore, results may vary from person to person, according to the operations carried out by each individual.</li>
                <li>The "DalioBot" website is not responsible for any type of financial transaction between the user and the developer/company that is marketing the robot. We only connect investors and validated automated strategies. The entire hiring process is done directly between the person responsible for the strategy and the user.</li>
                <li>The statistical data of all robots are provided directly by the developer. Therefore, the accuracy of the information is their sole responsibility.</li>
                <li>By registering a robot, you agree that the data contained in the import CSV has not been manipulated.</li>
                <li>The site offers no warranty linked to the Platform, and its use, and is not responsible for any damages or losses resulting from its use. The use of the Platform and the disclosed robots is the sole responsibility of the user, who must use their own knowledge and techniques to decide on their investments.</li>
              </ol>
              <p className="font-semibold text-gray-800">Using the Beta Version:</p>
              <p>This version of the platform is a free beta, offered for a limited time to test its features. All features are provided "as is" and may contain bugs or be subject to changes. The DalioBot website is not responsible, under any circumstances, for any damage or loss, material or moral, related to the use of the platform during the beta period.</p>
              <p>The "Payment Processing" and pricing sections are not applicable to the Beta Version. However, please read our general terms of use, as they apply to the use of all our services.</p>
            </div>
            <div className="mt-6 text-right border-t pt-4">
              <button onClick={() => setIsTermsModalOpen(false)} className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold">Close</button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================== */}
      {/* ================ POPUP DE CONTATO ======================== */}
      {/* ========================================================== */}
      {isContactModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-sm w-full text-center">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex-grow text-center">Contact</h2>
              <button onClick={() => setIsContactModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-3xl leading-none -mt-4 -mr-2" aria-label="Fechar popup">&times;</button>
            </div>
            <div className="text-gray-600 space-y-4">
              <p>For questions, support or other issues, please contact us via email:</p>
              <p className="font-semibold text-purple-600 bg-purple-50 p-2 rounded">
                daliobotcontact@gmail.com
              </p>
            </div>
            <div className="mt-6">
              <button onClick={() => setIsContactModalOpen(false)} className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold w-full">Close</button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================== */}
      {/* ================ POPUP DE CONSENTIMENTO DE COOKIES ======= */}
      {/* ========================================================== */}
      {showCookieConsent && (
        <div className="fixed inset-x-0 bottom-0 z-[100] p-4 bg-purple-800/90 backdrop-blur-sm text-white shadow-lg">
          <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">
              We use cookies to improve your experience on our site and to analyze traffic. By continuing to use our website, you agree to our <button onClick={() => setIsPrivacyModalOpen(true)} className="underline font-semibold hover:text-purple-300">Privacy Policy</button>.
            </p>
            <button onClick={handleAcceptCookies} className="w-full md:w-auto flex-shrink-0 bg-white text-purple-700 text-sm font-semibold px-6 py-2 rounded-md hover:bg-gray-200 transition-colors">
              Got it!
            </button>
          </div>
        </div>
      )}
      {/* ========================================================== */}
      {/* ============= POPUP DA POLÍTICA DE PRIVACIDADE ============= */}
      {/* ========================================================== */}
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-xl font-bold text-gray-800">Privacy Policy</h2>
              <button onClick={() => setIsPrivacyModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-3xl leading-none" aria-label="Close popup">&times;</button>
            </div>
            <div className="text-sm text-gray-600 space-y-4 overflow-y-auto pr-2">
              <p>Welcome to DalioBot! Your privacy is critically important to us. This Privacy Policy outlines how we collect, use, store, share, and protect your information when you use our platform.</p>
              <h3 className="text-md font-semibold text-gray-800 pt-2">1. Data We Collect</h3>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Account Information:</strong> When you register, we collect your name, email address, and a hashed password.</li>
                <li><strong>Backtest and Portfolio Data:</strong> We store all data from your uploaded `.csv` files and the portfolios you create. This sensitive data is used solely to provide you with analysis within your account and is never shared.</li>
                {/* REMOVIDO: Ponto sobre "Payment Data" */}
                <li><strong>Usage Data:</strong> We automatically collect technical and usage data to improve our service.</li>
              </ul>
              <h3 className="text-md font-semibold text-gray-800 pt-2">2. How We Use Your Data</h3>
              <p>We use your data to provide and maintain the service, improve the platform, communicate with you, ensure security, and process payments.</p>
              <h3 className="text-md font-semibold text-gray-800 pt-2">3. Data Sharing</h3>
              <p>We do not sell your personal information. We only share data with essential partners for platform operation, such as cloud infrastructure providers (Firebase/Google Cloud) and payment processors, under strict confidentiality agreements.</p>
              <h3 className="text-md font-semibold text-gray-800 pt-2">4. Your Rights</h3>
              <p>In accordance with data protection laws like LGPD, you have the right to access, correct, delete, or transfer your data, and revoke consent. To exercise your rights, please contact us.</p>
              <h3 className="text-md font-semibold text-gray-800 pt-2">5. Contact Us</h3>
              <p>If you have any questions about this Privacy Policy, please contact us at: <span className="font-medium text-purple-600">daliobotcontact@gmail.com</span></p>
            </div>
            <div className="mt-6 text-right border-t pt-4">
              <button onClick={() => setIsPrivacyModalOpen(false)} className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold">Close</button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================== */}
      {/* ============= POPUP DA POLÍTICA DE REEMBOLSO ============== */}
      {/* ========================================================== */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-xl font-bold text-gray-800">Refund Policy</h2>
              <button onClick={() => setIsRefundModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-3xl leading-none" aria-label="Close popup">&times;</button>
            </div>
            <div className="text-sm text-gray-600 space-y-4 overflow-y-auto pr-2">
              <p>At DalioBot, we want you to be completely satisfied with your purchase. We offer a 14-day money-back guarantee for all our plans.</p>
              <p>If for any reason you are not satisfied with our service within the first 14 days of your initial subscription (monthly or annual), please contact us at <span className="font-medium text-purple-600">daliobotcontact@gmail.com</span> to request a full refund.</p>
              <p>For the "Founder's Pack" (Lifetime Subscription), the period for a refund request is also 14 days from the date of purchase.</p>
              <p>Please note that refunds are processed through our payment partner, Paddle.com, and may take 5-10 business days to appear on your statement.</p>
            </div>
            <div className="mt-6 text-right border-t pt-4">
              <button onClick={() => setIsRefundModalOpen(false)} className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}