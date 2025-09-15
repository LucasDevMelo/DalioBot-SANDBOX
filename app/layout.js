'use client';

import '../styles/globals.css';
import { AuthProvider, useAuth } from '@/src/context/authcontext';
import { useEffect } from 'react'; // Alterado: useState e Script não são mais necessários aqui
import { usePathname, useRouter } from 'next/navigation';
// Removido: import Script from 'next/script'; // Script não é mais necessário

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
      // O '/cadastro' agora é considerado uma rota pública sem a lógica de planos.
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
    // Removido: Toda a lógica de inicialização do Paddle e a dependência de isPaddleReady
  }, [user, loading, router, pathname]);

  // Enquanto o status de autenticação carrega, exibe um spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-4 h-4 bg-purple-600 rounded-full animate-pulse"></div>
          <div className="w-4 h-4 bg-purple-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-4 h-4 bg-purple-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    );
  }

  // Após carregar e validar, renderiza o conteúdo da página
  return <>{children}</>;
}

/**
 * O layout principal exportado
 * @param {{ children: React.ReactNode }} props
 */
// ...
export default function RootLayout({ children }) {
  return (
    <html lang="en-US">
      <head>
        {/* Removido: Script do Paddle.js */}
      </head>
      <body className="bg-gray-100">
        <AuthProvider>
          <ClientLogicWrapper>
            <main>{children}</main>
          </ClientLogicWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}