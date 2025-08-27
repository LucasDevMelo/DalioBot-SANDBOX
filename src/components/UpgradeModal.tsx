'use client';

import React, { useState } from 'react';
// Caminhos de importação com o alias original do projeto
import { useAuth } from '@/src/context/authcontext';
import { PADDLE_PRICE_IDS, openPaddleCheckout, getPlanNameFromPriceId } from '@/src/utils/paddleUtils';
import { RefreshCw } from 'lucide-react';

// Props que o modal vai aceitar
interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Componente de Card para cada plano
const PlanCard = ({ title, description, monthlyPrice, annualPrice, billingCycle, planType, onSubscribe, loadingPlan, currentPlan, isRenewal }: {
    title: string;
    description: string;
    monthlyPrice: number;
    annualPrice: number;
    billingCycle: 'monthly' | 'annual';
    planType: 'basic' | 'pro';
    onSubscribe: (planId: string) => void;
    loadingPlan: string | null;
    currentPlan: string | null;
    isRenewal: boolean;
}) => {
    const priceId = billingCycle === 'monthly'
        ? (planType === 'basic' ? PADDLE_PRICE_IDS.basicMonthly : PADDLE_PRICE_IDS.proMonthly)
        : (planType === 'basic' ? PADDLE_PRICE_IDS.basicAnnual : PADDLE_PRICE_IDS.proAnnual);

    const isLoading = loadingPlan === priceId;
    const isCurrentPlan = currentPlan?.toLowerCase() === planType.toLowerCase();

    // Lógica para o texto do botão
    const getButtonContent = () => {
        if (isLoading) return 'Loading...';
        if (isCurrentPlan && !isRenewal) return 'Your current plan';
        if (isCurrentPlan && isRenewal) return 'Renew Plan';
        if (isRenewal) return 'Switch to this Plan';
        return 'Upgrade';
    };

    return (
        <div className={`border rounded-lg p-6 flex flex-col ${planType === 'pro' ? 'border-purple-500 border-2' : 'border-gray-300'}`}>
            <h3 className={`font-bold text-xl ${planType === 'pro' ? 'text-purple-700' : 'text-gray-800'}`}>{title}</h3>
            <p className="text-gray-500 text-sm mt-1 flex-grow">{description}</p>

            <div className="my-6">
                {billingCycle === 'monthly' ? (
                    <p className="flex items-baseline">
                        <span className="text-4xl font-extrabold text-gray-900">${monthlyPrice}</span>
                        <span className="ml-1 text-lg font-medium text-gray-500">/month</span>
                    </p>
                ) : (
                    <div>
                        <p className="flex items-baseline">
                            <span className="text-4xl font-extrabold text-gray-900">${annualPrice}</span>
                            <span className="ml-1 text-lg font-medium text-gray-500">/year</span>
                        </p>
                        <p className="mt-1 text-xs text-green-600 font-semibold">Save 2 months!</p>
                    </div>
                )}
            </div>

            {isCurrentPlan && !isRenewal ? (
                <button
                    disabled
                    className="w-full mt-2 font-semibold py-2.5 rounded-lg text-center bg-green-100 text-green-800 cursor-default"
                >
                    {getButtonContent()}
                </button>
            ) : (
                <button
                    onClick={() => onSubscribe(priceId)}
                    disabled={isLoading || (loadingPlan !== null && !isLoading)}
                    className={`w-full mt-2 font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${planType === 'pro' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                >
                    {getButtonContent()}
                </button>
            )}
        </div>
    );
};


export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
    const { user, subscription } = useAuth();

    const currentPlanName = getPlanNameFromPriceId(subscription?.planName);

    // Variável de estado para controlar o modo de renovação
    const isRenewal = subscription?.isActive === false;

    const handleSubscribe = (planId: string) => {
        if (!user) {
            console.error("You must be logged in to upgrade.");
            return;
        }
        setLoadingPlan(planId);
        openPaddleCheckout(planId, {
            firebaseUid: user.uid,
            userEmail: user.email,
        });

        setTimeout(() => {
            setLoadingPlan(null);
            onClose();
        }, 1500);
    };

    // Função específica para o botão de renovação
    const handleRenew = () => {
        if (!subscription || !currentPlanName) return;

        // Reconstrói o Price ID do plano atual com base no ciclo de cobrança
        const renewalPriceId = billingCycle === 'monthly'
            ? (currentPlanName === 'basic' ? PADDLE_PRICE_IDS.basicMonthly : PADDLE_PRICE_IDS.proMonthly)
            : (currentPlanName === 'basic' ? PADDLE_PRICE_IDS.basicAnnual : PADDLE_PRICE_IDS.proAnnual);

        handleSubscribe(renewalPriceId);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-2xl text-black relative transform transition-all">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>

                {/* Título e descrição dinâmicos */}
                {isRenewal ? (
                    <>
                        <h2 className="text-2xl font-bold text-center text-gray-900">Renew Your Subscription</h2>
                        <p className="text-center text-gray-500 mt-2">Your plan is inactive. Renew now to regain access to all features.</p>
                    </>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold text-center text-gray-900">Upgrade Your Plan</h2>
                        <p className="text-center text-gray-500 mt-2">Choose the ideal plan to unlock the platform's full potential.</p>
                    </>
                )}

                <div className="flex justify-center my-8">
                    <div className="bg-gray-200 rounded-lg p-1 flex items-center space-x-1">
                        <button onClick={() => setBillingCycle('monthly')} className={`px-6 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${billingCycle === 'monthly' ? 'bg-white text-purple-700 shadow' : 'text-gray-500'}`}>
                            Monthly
                        </button>
                        <button onClick={() => setBillingCycle('annual')} className={`relative px-6 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${billingCycle === 'annual' ? 'bg-white text-purple-700 shadow' : 'text-gray-500'}`}>
                            Annual <span className="absolute -top-2 -right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">-17%</span>
                        </button>
                    </div>
                </div>

                {/* Card de Renovação Condicional */}
                {isRenewal && currentPlanName && (
                    <div className="mb-6">
                        <div className="border-2 border-green-500 bg-green-50 rounded-lg p-6 text-center">
                            <h3 className="text-lg font-bold text-green-800">Your Current Plan: <span className="capitalize">{currentPlanName}</span></h3>
                            <p className="text-green-700 mt-1 text-sm">Renew your plan to continue using your benefits.</p>
                            <button
                                onClick={handleRenew}
                                disabled={loadingPlan !== null}
                                className="mt-4 w-full max-w-xs mx-auto inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white rounded-lg shadow-sm bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                            >
                                {loadingPlan ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <RefreshCw className="mr-2 h-5 w-5" />}
                                {loadingPlan ? 'Processing...' : 'Renew Subscription'}
                            </button>
                        </div>
                        <div className="relative text-center my-4">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-white px-2 text-sm text-gray-500">OR</span>
                            </div>
                        </div>
                        <p className="text-center text-gray-500 -mt-2 mb-4">Choose another plan below.</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <PlanCard
                        title="Basic"
                        description="For individual investors seeking clarity."
                        monthlyPrice={20}
                        annualPrice={200}
                        billingCycle={billingCycle}
                        planType="basic"
                        onSubscribe={handleSubscribe}
                        loadingPlan={loadingPlan}
                        currentPlan={currentPlanName}
                        isRenewal={isRenewal}
                    />
                    <PlanCard
                        title="Pro"
                        description="For advanced investors seeking total optimization."
                        monthlyPrice={35}
                        annualPrice={350}
                        billingCycle={billingCycle}
                        planType="pro"
                        onSubscribe={handleSubscribe}
                        loadingPlan={loadingPlan}
                        currentPlan={currentPlanName}
                        isRenewal={isRenewal}
                    />
                </div>
            </div>
        </div>
    );
}
