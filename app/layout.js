// app/layout.js (VERSÃO CORRIGIDA E FINAL)

'use client';

import '../styles/globals.css';
import { AuthProvider, useAuth } from '@/src/context/authcontext';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Script from 'next/script';

/**
 * Componente interno que lida com toda a lógica de cliente.
 * @param {{ children: React.ReactNode }} props
 */
function ClientLogicWrapper({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isPaddleReady, setIsPaddleReady] = useState(false);

  // Este useEffect agora gerencia tanto a proteção de rotas quanto a inicialização do Paddle
  useEffect(() => {
    // --- SEÇÃO: LÓGICA DE PROTEÇÃO DE ROTAS ---
    // Só executa a lógica depois que o status de autenticação do Firebase for resolvido.
    if (!loading) {
      // Lista de páginas que um usuário DESLOGADO pode acessar.
      const rotasPublicas = ['/home', '/login', '/cadastro'];
      // Verifica se a rota atual é uma das públicas.
      // Usamos startsWith para o /cadastro poder ter parâmetros de plano (ex: /cadastro?plan=...).
      const aPaginaAtualEhPublica = rotasPublicas.some(rota => pathname.startsWith(rota));

      // Cenário 1: Usuário DESLOGADO tentando acessar uma página protegida.
      if (!user && !aPaginaAtualEhPublica) {
        // Manda para a home para escolher um plano ou fazer login.
        router.push('/home');
      }

      // ===================================================================
      // A CORREÇÃO DEFINITIVA ESTÁ AQUI
      // ===================================================================
      // Cenário 2: Usuário LOGADO tentando acessar páginas que não deveria.
      if (user) {
        // Se um usuário logado tentar acessar a página de login ou a home,
        // o redirecionamos para a área logada.
        // A página de CADASTRO é INTENCIONALMENTE deixada de fora desta regra
        // para não quebrar o fluxo de pagamento.
        if (pathname === '/login' || pathname === '/home') {
          router.push('/welcome');
        }
      }
    }

    // --- SEÇÃO: LÓGICA DE INICIALIZAÇÃO DO PADDLE ---
    // (Esta parte continua igual e está correta)
    if (typeof window !== 'undefined' && window.Paddle && !isPaddleReady) {
      console.log("✅ Paddle script loaded, initializing in layout...");

      const sandboxToken = "test_cebfb4de8388f17543aa67c8ad6";

      window.Paddle.Initialize({
        token: sandboxToken,
        eventCallback: (event) => {
          console.log("Paddle Event:", event.name);
        }
      });
      window.Paddle.Environment.set('sandbox');
      setIsPaddleReady(true);
    }

  }, [user, loading, router, pathname, isPaddleReady]);

  // Enquanto o status de autenticação carrega, exibe um spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        {/* Animação de carregamento com três pontos pulsantes */}
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
export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <head>
        <Script
          src="https://cdn.paddle.com/paddle/v2/paddle.js"
          strategy="afterInteractive"
          onLoad={() => {
            console.log("Paddle script successfully loaded into document.");
          }}
        />
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
