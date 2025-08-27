'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/src/firebase';
// ✅ 1. Importar os IDs de preço para podermos verificar o plano vitalício
import { PADDLE_PRICE_IDS } from '@/src/utils/paddleUtils'; 

// ✅ 2. Definir a interface completa com TODAS as propriedades necessárias no app
interface SubscriptionData {
    planName: string;       // O ID do plano (ex: 'pri_...')
    isActive: boolean;        // O status da assinatura (nome padronizado)
    isLifetime: boolean;    // Flag para saber se o plano é vitalício
    assinaturaAtiva: boolean; // Campo original para retrocompatibilidade
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    subscription: SubscriptionData | null;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    subscription: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (userAuth) => {
            setUser(userAuth);
            if (!userAuth) {
                setSubscription(null);
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user) {
            if (!loading) setLoading(true); // Garante que o loading volte se o usuário deslogar
            return;
        }

        const userDocRef = doc(db, 'users', user.uid);

        // ✅ 3. Lógica ATUALIZADA para preencher a nova interface completa
        const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                const userData = doc.data();

                if (userData.plano) {
                    const planId = userData.plano; // ID do plano vindo do DB

                    const subscriptionData: SubscriptionData = {
                        planName: planId,
                        isActive: userData.assinaturaAtiva,
                        // Mantemos o campo original para evitar quebrar outras partes do código
                        assinaturaAtiva: userData.assinaturaAtiva, 
                        // Derivamos o valor de 'isLifetime' comparando o ID do plano
                        isLifetime: planId === PADDLE_PRICE_IDS.proLifetime,
                    };
                    setSubscription(subscriptionData);
                } else {
                    setSubscription(null);
                }
            } else {
                setSubscription(null);
            }
            
            setLoading(false);
        });

        return () => unsubscribeSnapshot();
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, loading, subscription }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);