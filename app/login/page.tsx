'use client';
import { useState } from 'react';
import { auth } from '@/src/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [erro, setErro] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErro('');
        setLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, senha);
            router.push('/home');
        } catch (error: any) {
            console.error('Login error:', error.code);
            switch (error.code) {
                case 'auth/invalid-credential':
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    setErro('Email ou senha inválidos.');
                    break;
                case 'auth/invalid-email':
                    setErro('O formato do email é inválido.');
                    break;
                case 'auth/too-many-requests':
                    setErro('Acesso bloqueado temporariamente. Tente novamente mais tarde.');
                    break;
                default:
                    setErro('Ocorreu um erro ao tentar fazer login.');
                    break;
            }
        } finally {
            setLoading(false);
        }
    };

    // CORREÇÃO: Adicionado "as const" para garantir a tipagem correta com o Framer Motion.
    const cardVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { 
                type: 'spring',
                stiffness: 150,
                damping: 20,
                staggerChildren: 0.1 
            }
        }
    } as const;

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    } as const;

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center bg-slate-900 text-gray-200 px-4 overflow-hidden">
            {/* Fundo com gradiente e efeito aurora */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 -left-1/4 w-96 h-96 md:w-[40rem] md:h-[40rem] bg-purple-600/30 rounded-full filter blur-3xl opacity-50 animate-blob"></div>
                <div className="absolute bottom-0 -right-1/4 w-96 h-96 md:w-[40rem] md:h-[40rem] bg-fuchsia-600/20 rounded-full filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
            </div>
            
            <div className="relative z-10 flex flex-col items-center w-full">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <Link href="/" className="text-4xl font-extrabold mb-12">
                        <span className="text-white">Dalio</span>
                        <span className="text-purple-400">bot</span>
                    </Link>
                </motion.div>

                <motion.div
                    className="w-full max-w-md bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl p-8 shadow-2xl shadow-purple-900/20"
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.h2 variants={itemVariants} className="text-2xl font-bold text-center text-white mb-6">
                        Acessar Plataforma
                    </motion.h2>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <motion.div variants={itemVariants}>
                            <input
                                type="email"
                                placeholder="Seu email"
                                className="w-full px-4 py-3 bg-slate-900/70 border border-slate-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <input
                                type="password"
                                placeholder="Sua senha"
                                className="w-full px-4 py-3 bg-slate-900/70 border border-slate-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                                required
                            />
                        </motion.div>

                        {erro && (
                            <motion.p 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                className="text-red-500 text-sm text-center"
                            >
                                {erro}
                            </motion.p>
                        )}
                        
                        <motion.div variants={itemVariants}>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg transition-all duration-300 ease-in-out hover:bg-purple-700 hover:scale-105 shadow-[0_0_15px_theme(colors.purple.500/50)] hover:shadow-[0_0_25px_theme(colors.purple.500)] disabled:bg-slate-600 disabled:shadow-none disabled:hover:scale-100 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Entrando...' : 'Login'}
                            </button>
                        </motion.div>
                    </form>
                    
                    <motion.p variants={itemVariants} className="text-sm text-center text-gray-400 mt-8">
                        Ainda não tem uma conta?{' '}
                        <Link href="/cadastro" className="font-semibold text-purple-400 hover:underline">
                            Cadastre-se
                        </Link>
                    </motion.p>
                </motion.div>
            </div>
        </div>
    );
}