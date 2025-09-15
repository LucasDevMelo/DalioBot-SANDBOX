'use client';

import HomePage from './welcome/page';

export default function Home() {
  // O roteamento e a verificação de autenticação já são tratados
  // no componente RootLayout. Se o usuário estiver logado, ele
  // chegará a esta página. Se não estiver, será redirecionado para o login.
  return <HomePage />;
}