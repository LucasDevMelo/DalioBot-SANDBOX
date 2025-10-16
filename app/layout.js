'use client';

import '../styles/globals.css';
import { AuthProvider, useAuth } from '@/src/context/authcontext';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Spinner de carregamento reutilizável para o estado inicial da aplicação.
 */
const LoadingSpinner = () => (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <svg className="animate-spin h-12 w-12 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);


/**
 * Componente interno que lida com toda a lógica de cliente.
 * @param {{ children: React.ReactNode }} props
 */
function ClientLogicWrapper({ children }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // Este useEffect agora gerencia apenas a proteção de rotas
    useEffect(() => {
        // Só executa a lógica depois que o status de autenticação do Firebase for resolvido.
        if (!loading) {
            // Lista de páginas que um usuário DESLOGADO pode acessar.
            const rotasPublicas = ['/home', '/login', '/cadastro'];
            const aPaginaAtualEhPublica = rotasPublicas.some(rota => pathname.startsWith(rota));

            // Cenário 1: Usuário DESLOGADO tentando acessar uma página protegida.
            if (!user && !aPaginaAtualEhPublica) {
                router.push('/home');
            }

            // Cenário 2: Usuário LOGADO tentando acessar páginas que não deveria.
            if (user) {
                // Se um usuário logado tentar acessar a página de login, cadastro ou a home,
                // o redirecionamos para a área logada.
                if (pathname === '/login' || pathname === '/home' || pathname === '/cadastro') {
                    router.push('/welcome');
                }
            }
        }
    }, [user, loading, router, pathname]);

    // Enquanto o status de autenticação carrega, exibe um spinner
    if (loading) {
        return <LoadingSpinner />;
    }

    // Após carregar e validar, renderiza o conteúdo da página
    return <>{children}</>;
}

/**
 * O layout principal exportado
 * @param {{ children: React.ReactNode }} props
 */
export default function RootLayout({ children }) {
    return (
        <html lang="pt-BR">
            <head>
                {/* Metatags e links podem ser adicionados aqui */}
            </head>
            <body className="bg-slate-900 text-gray-200">
                <AuthProvider>
                    <ClientLogicWrapper>
                        <main>{children}</main>
                    </ClientLogicWrapper>
                </AuthProvider>
            </body>
        </html>
    );
}