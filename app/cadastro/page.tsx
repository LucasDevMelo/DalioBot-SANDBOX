'use client';

import { useState } from 'react';
import { auth, db } from '@/src/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle } from 'react-icons/fa';

export default function CadastroPage() {
    const router = useRouter();
    
    // Estados do formulário
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [aceitouTermos, setAceitouTermos] = useState(false);

    // Estados de feedback e UI
    const [erro, setErro] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mostrarTermos, setMostrarTermos] = useState(false);
    const [cadastroConcluido, setCadastroConcluido] = useState(false);

    const handleCadastro = async (e: React.FormEvent) => {
        e.preventDefault();
        setErro('');

        if (!aceitouTermos) {
            setErro('Você precisa aceitar os termos de uso.');
            return;
        }
        if (senha !== confirmarSenha) {
            setErro('As senhas não coincidem.');
            return;
        }
        if (senha.length < 6) {
            setErro('A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        setIsLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
            const user = userCredential.user;
            await updateProfile(user, { displayName: nome });

            await setDoc(doc(db, 'users', user.uid), {
                nome: nome,
                email: user.email,
                plano: 'beta',
                assinaturaAtiva: true,
                criadoEm: new Date()
            });
            
            setCadastroConcluido(true);
            setTimeout(() => router.push('/home'), 3000);

        } catch (error: any) {
            console.error('Erro no cadastro:', error.code);
            if (error.code === 'auth/email-already-in-use') {
                setErro('Este endereço de email já está em uso.');
            } else {
                setErro('Ocorreu um erro inesperado. Tente novamente.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { type: 'spring', stiffness: 150, damping: 20, staggerChildren: 0.1 }
        }
    } as const;

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    } as const;

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
        <div className="relative min-h-screen flex flex-col items-center justify-center bg-slate-900 text-gray-200 px-4 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 -left-1/4 w-96 h-96 md:w-[40rem] md:h-[40rem] bg-purple-600/30 rounded-full filter blur-3xl opacity-50 animate-blob"></div>
                <div className="absolute bottom-0 -right-1/4 w-96 h-96 md:w-[40rem] md:h-[40rem] bg-fuchsia-600/20 rounded-full filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
            </div>
            
            <div className="relative z-10 flex flex-col items-center w-full">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <Link href="/" className="text-4xl font-extrabold mb-12">
                        <span className="text-white">Dalio</span><span className="text-purple-400">bot</span>
                    </Link>
                </motion.div>

                <div className="w-full max-w-md">
                    <AnimatePresence mode="wait">
                        {!cadastroConcluido ? (
                            <motion.div
                                key="form"
                                className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl p-8 shadow-2xl shadow-purple-900/20"
                                variants={cardVariants}
                                initial="hidden"
                                animate="visible"
                                exit={{ opacity: 0, y: -30 }}
                            >
                                <motion.h2 variants={itemVariants} className="text-2xl font-bold text-center text-white mb-6">
                                    Crie sua Conta Grátis
                                </motion.h2>
                                <form onSubmit={handleCadastro} className="space-y-5">
                                    <motion.input variants={itemVariants} type="text" placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} required className="w-full px-4 py-3 bg-slate-900/70 border border-slate-600 rounded-lg placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                                    <motion.input variants={itemVariants} type="email" placeholder="Seu melhor email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 bg-slate-900/70 border border-slate-600 rounded-lg placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                                    <motion.input variants={itemVariants} type="password" placeholder="Crie uma senha" value={senha} onChange={(e) => setSenha(e.target.value)} required className="w-full px-4 py-3 bg-slate-900/70 border border-slate-600 rounded-lg placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                                    <motion.input variants={itemVariants} type="password" placeholder="Confirme sua senha" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} required className="w-full px-4 py-3 bg-slate-900/70 border border-slate-600 rounded-lg placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                                    
                                    <motion.label variants={itemVariants} className="flex items-center text-sm gap-3 text-gray-400 cursor-pointer">
                                        <input type="checkbox" checked={aceitouTermos} onChange={(e) => setAceitouTermos(e.target.checked)} className="sr-only peer" />
                                        <div className="w-5 h-5 bg-slate-700 rounded border border-slate-600 peer-checked:bg-purple-600 peer-checked:border-purple-500 flex items-center justify-center transition-colors">
                                           {aceitouTermos && <FaCheckCircle className="text-white text-xs" />}
                                        </div>
                                        <span>Li e aceito os <button type="button" onClick={() => setMostrarTermos(true)} className="text-purple-400 hover:underline font-semibold">termos de uso</button></span>
                                    </motion.label>
                                    
                                    {erro && <motion.p initial={{opacity: 0}} animate={{opacity: 1}} className="text-red-500 text-sm text-center">{erro}</motion.p>}
                                    
                                    <motion.button variants={itemVariants} type="submit" disabled={isLoading} className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg transition-all duration-300 ease-in-out hover:bg-purple-700 hover:scale-105 shadow-[0_0_15px_theme(colors.purple.500/50)] disabled:bg-slate-600 disabled:shadow-none disabled:cursor-not-allowed">
                                        {isLoading ? 'Criando conta...' : 'Criar Conta e Acessar'}
                                    </motion.button>
                                </form>
                                <motion.p variants={itemVariants} className="text-sm text-center text-gray-400 mt-6">
                                    Já possui uma conta? <Link href="/login" className="font-semibold text-purple-400 hover:underline">Faça login</Link>
                                </motion.p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="success"
                                className="w-full text-center bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl p-8 shadow-2xl shadow-purple-900/20"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: 'spring' }}
                            >
                                <FaCheckCircle className="text-5xl text-green-500 mx-auto mb-4" />
                                <h2 className="text-2xl font-bold text-white">Conta Criada!</h2>
                                <p className="text-gray-300 mt-2">
                                    Bem-vindo(a) ao DalioBot Beta! Você será redirecionado em instantes.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {mostrarTermos && (
                <Modal closeModal={() => setMostrarTermos(false)}>
                    <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
                        <h2 className="text-xl font-bold text-white">Termos de Uso</h2>
                        <button onClick={() => setMostrarTermos(false)} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
                    </div>
                    {/* CORREÇÃO AQUI: Texto formatado com parágrafos e listas */}
                    <div className="text-sm text-gray-300 space-y-4 overflow-y-auto pr-2">
                        <p>
                            Please carefully read the terms and conditions below ("Terms of Use") so that you can enjoy our platform and all the services made available through it, all of which are the exclusive property of the website https://daliobot-en.netlify.app/. By using the platform, our products and/or services, including our content made available through the Platform, you are agreeing to these Terms of Use. If you do not agree, we ask that you do not use our products and/or services, as your use represents your full acceptance of these Terms of Use.
                        </p>
                        <p>
                            Tolerance regarding non-compliance with any obligation set forth in the Platform's Terms of Use will not signify a waiver of the right to demand compliance with the obligation, nor an alteration of any term or condition contained herein.
                        </p>
                        <p>
                            For a better experience for its Users, BotSpot may, from time to time, partially or fully change the Terms of Use. But, of course: in the event of a change, you will be informed when you access the platform again, whether logged in or not, and the user will be required to accept the Terms of Use again. In the specific case of personal data or sensitive data processing, you will be fully informed about any and all actions taken in this regard, providing prior consent whenever necessary. If you do not agree with the changes we have made, you can cancel your account and cease any and all use of the products and services.
                        </p>
                        <ol className="list-decimal list-inside space-y-3 pl-2">
                            <li>The history of profitability or analyses are not a guarantee of future returns. The variable income market involves risks and is subject to various eventualities and external effects that involve unpredictability and, thus, financial risks. In addition, results may vary from person to person, according to the operations performed by each individual.</li>
                            <li>The "DalioBot" website is not responsible for any type of financial transaction between the user and the developer/company that is commercializing the robot. We only connect investors and validated automated strategies. The entire hiring process is done directly by the strategy's owner and the user.</li>
                            <li>The statistical data of all robots are provided directly by the developer. Therefore, the accuracy of the information is their sole responsibility.</li>
                            <li>By registering a robot, you agree that the data contained in the import CSV has not been manipulated.</li>
                            <li>The site offers no warranty linked to the Platform, or its use, and is not responsible for any damages or losses that result from its use. The use of the Platform and the robots disclosed is the sole responsibility of the user, who must use their own knowledge and techniques to decide on their investments.</li>
                        </ol>
                        <p className='font-bold text-white pt-2'>
                            Using the Beta Version
                        </p>
                        <p>
                            The "Payment Processing" and pricing sections are not applicable to the Beta Version. However, please read our general terms of use, as they apply to the use of all our services.
                        </p>
                    </div>
                    <div className="mt-6 text-right border-t border-slate-700 pt-4">
                        <button onClick={() => setMostrarTermos(false)} className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold">Fechar</button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
