'use client';
import { useState } from 'react';
import { auth } from '@/src/firebase'; // A nova conexão com Firebase
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [erro, setErro] = useState('');

    const handleLogin = async () => {
        setErro('');

        try {
            await signInWithEmailAndPassword(auth, email, senha);
            console.log('User logged in successfully!');

            // Wait a moment to ensure state is settled before redirecting
            await new Promise((resolve) => setTimeout(resolve, 1000));
            router.refresh();
            router.push('/home');
        } catch (error: any) {
            console.error('Login error:', error);
            // Firebase usually provides English error messages by default.
            setErro(error.message);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-purple-500 px-4 sm:px-6">
            {/* Logo with bottom margin */}
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-10 sm:mb-12 text-center">
                <span className="text-white">Dalio</span>
                <span className="text-black bg-white px-2 rounded">Bot</span>
            </h1>

            {/* Login card */}
            <div className="bg-white p-6 sm:p-8 rounded shadow-md w-full max-w-xs sm:max-w-md space-y-4">
                <h2 className="text-xl sm:text-2xl font-bold text-center">Login</h2>
                <input
                    type="email"
                    placeholder="Email"
                    className="w-full px-3 py-2 sm:px-4 sm:py-2 border rounded text-sm sm:text-base"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Password"
                    className="w-full px-3 py-2 sm:px-4 sm:py-2 border rounded text-sm sm:text-base"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                />
                {erro && <p className="text-red-600 text-sm">{erro}</p>}
                <button
                    onClick={handleLogin}
                    className="bg-black text-white px-4 py-2 rounded w-full hover:bg-purple-900 text-sm sm:text-base"
                >
                    Login
                </button>
                <p className="text-xs sm:text-sm text-center text-gray-600">
                    Not registered yet?{' '}
                    <a href="/cadastro" className="text-purple-600 hover:underline">
                        Register
                    </a>
                </p>
            </div>
        </div>
    );
}
