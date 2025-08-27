'use client';

import { useAuth } from '@/src/context/authcontext';
import LoginPage from '../app/login/page';
import HomePage from './welcome/page';

export default function Home() {
  const { user } = useAuth();

  return user ? <HomePage /> : <LoginPage />;
}
