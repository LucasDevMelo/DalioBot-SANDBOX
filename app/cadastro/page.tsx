'use client';

import { useState } from 'react';
import { auth, db } from '@/src/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CadastroPage() {
    const router = useRouter();
    // REMOVIDO: const searchParams = useSearchParams();
    // REMOVIDO: const plan = searchParams.get('plan');

    // --- Estados do Componente ---
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [aceitouTermos, setAceitouTermos] = useState(false);

    // Estados para feedback ao usuário
    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mostrarTermos, setMostrarTermos] = useState(false);
    const [cadastroConcluido, setCadastroConcluido] = useState(false);

    const handleCadastro = async () => {
        setErro('');
        setSucesso('');

        // --- Initial Validations ---
        if (!aceitouTermos) {
            setErro('You must agree to the terms of use.');
            return;
        }
        if (senha !== confirmarSenha) {
            setErro('The passwords do not match.');
            return;
        }
        if (senha.length < 6) {
            setErro('The password must be at least 6 characters long.');
            return;
        }

        setIsLoading(true);

        try {
            // --- STEP 1: Create user in Firebase Authentication ---
            const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
            const user = userCredential.user;

            await updateProfile(user, { displayName: nome });

            // --- STEP 2: Create initial document in Firestore for BETA plan ---
            await setDoc(doc(db, 'users', user.uid), {
                nome: nome,
                email: user.email,
                plano: 'beta', // ADICIONADO: Define o plano como 'beta'
                assinaturaAtiva: true, // ADICIONADO: Considera a assinatura como ativa durante a beta
                criadoEm: new Date()
            });

            // --- STEP 3: Redirection to the Welcome page for beta users ---
            setCadastroConcluido(true);
            setIsLoading(false);
            setSucesso('Account created successfully! You will be redirected to the platform.');
            setTimeout(() => router.push('/welcome'), 2000);

        } catch (error: any) {
            console.error('Error during sign-up:', error);
            if (error.code === 'auth/email-already-in-use') {
                setErro('This email address is already in use.');
            } else {
                setErro('An unexpected error occurred. Please try again.');
            }
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-purple-500 px-4 sm:px-6">
            {/* Logo */}
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-10 sm:mb-12 text-center">
                <span className="text-white">Dalio</span>
                <span className="text-black bg-white px-2 rounded">Bot</span>
            </h1>

            {/* Registration Card with Conditional Logic */}
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-xs sm:max-w-md space-y-4 transition-all duration-300">
                {!cadastroConcluido ? (
                    // --- STATE 1: SHOW REGISTRATION FORM ---
                    <>
                        <h1 className="text-xl sm:text-2xl font-bold text-center text-gray-800">Create Your Account</h1>
                        <input type="text" placeholder="Name" value={nome} onChange={(e) => setNome(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        <input type="password" placeholder="Password" value={senha} onChange={(e) => setSenha(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        <input type="password" placeholder="Confirm password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500" />

                        <label className="flex items-center text-xs sm:text-sm gap-2 text-gray-600">
                            <input type="checkbox" checked={aceitouTermos} onChange={(e) => setAceitouTermos(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                            I have read and agree to the{' '}
                            <button type="button" onClick={() => setMostrarTermos(true)} className="text-purple-600 hover:underline font-semibold">
                                terms of use
                            </button>
                        </label>

                        <button onClick={handleCadastro} disabled={isLoading} className="w-full bg-black text-white px-4 py-2.5 rounded-md font-semibold hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base">
                            {isLoading ? 'Creating account...' : 'Create Account'}
                        </button>

                        <p className="text-xs sm:text-sm text-center text-gray-600">
                            Already have an account?{' '}
                            <a href="/login" className="text-purple-600 hover:underline font-semibold">Log In</a>
                        </p>
                    </>
                ) : (
                    // --- STATE 2: SHOW POST-REGISTRATION MESSAGE ---
                    <div className="text-center py-4">
                        <h2 className="text-2xl font-bold text-gray-800">Account Created!</h2>
                        <p className="text-gray-600 mt-2">
                            Welcome to DalioBot Beta! You will be redirected to the platform shortly.
                        </p>
                        {sucesso && <p className="text-sm text-green-600 mt-4">{sucesso}</p>}
                        <button
                            onClick={() => router.push('/welcome')}
                            className="mt-6 w-full bg-black text-white px-4 py-2.5 rounded-md font-semibold hover:bg-gray-800 transition-colors text-sm sm:text-base"
                        >
                            Go to the platform
                        </button>
                    </div>
                )}

                {/* Error and success messages appear in both states */}
                {erro && <p className="text-red-600 text-xs sm:text-sm text-center bg-red-50 p-2 rounded-md">{erro}</p>}
                
            </div>

            {/* Terms of Use Modal (unchanged) */}
            {mostrarTermos && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 max-w-md sm:max-w-3xl w-full max-h-[80vh] overflow-y-auto">
                        <h2 className="text-lg sm:text-xl font-bold mb-4">Terms of Use</h2>
                        <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-line">
                            {`Please carefully read the terms and conditions below ("Terms of Use") so that you can enjoy our platform and all the services made available through it, all of which are the exclusive property of the website https://daliobot-en.netlify.app/. By using the platform, our products and/or services, including our content made available through the Platform, you are agreeing to these Terms of Use. If you do not agree, we ask that you do not use our products and/or services, as your use represents your full acceptance of these Terms of Use.

Tolerance regarding non-compliance with any obligation set forth in the Platform's Terms of Use will not signify a waiver of the right to demand compliance with the obligation, nor an alteration of any term or condition contained herein.

For a better experience for its Users, BotSpot may, from time to time, partially or fully change the Terms of Use. But, of course: in the event of a change, you will be informed when you access the platform again, whether logged in or not, and the user will be required to accept the Terms of Use again. In the specific case of personal data or sensitive data processing, you will be fully informed about any and all actions taken in this regard, providing prior consent whenever necessary. If you do not agree with the changes we have made, you can cancel your account and cease any and all use of the products and services.

1. The history of profitability or analyses are not a guarantee of future returns. The variable income market involves risks and is subject to various eventualities and external effects that involve unpredictability and, thus, financial risks. In addition, results may vary from person to person, according to the operations performed by each individual.

2. The "DalioBot" website is not responsible for any type of financial transaction between the user and the developer/company that is commercializing the robot. We only connect investors and validated automated strategies. The entire hiring process is done directly by the strategy's owner and the user.

3. The statistical data of all robots are provided directly by the developer. Therefore, the accuracy of the information is their sole responsibility.

4. By registering a robot, you agree that the data contained in the import CSV has not been manipulated.

5. The site offers no warranty linked to the Platform, or its use, and is not responsible for any damages or losses that result from its use. The use of the Platform and the robots disclosed is the sole responsibility of the user, who must use their own knowledge and techniques to decide on their investments.

The "Payment Processing" and pricing sections are not applicable to the Beta Version. However, please read our general terms of use, as they apply to the use of all our services.`}
                        </p>
                        <div className="text-right mt-4">
                            <button onClick={() => setMostrarTermos(false)}
                                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm sm:text-base">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}