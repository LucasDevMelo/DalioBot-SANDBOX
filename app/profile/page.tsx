'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/topbar';
import Sidebar from '@/components/sidebar';
import { auth, db } from '@/src/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    deleteUser
} from 'firebase/auth';

// Importing icons
import {
    UserCircleIcon,
    EnvelopeIcon,
    CalendarDaysIcon,
    ShieldCheckIcon,
    ArrowRightOnRectangleIcon,
    ExclamationTriangleIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';

// --- HELPERS AND SMALL COMPONENTS ---

// Loading Spinner Component for loading feedback
const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
    </div>
);

// Component for the subscription status badge
const StatusBadge = ({ isActive }) => {
    const baseClasses = "px-2.5 py-0.5 text-xs font-semibold rounded-full inline-block";
    const status = isActive
        ? { text: "Active", classes: "bg-green-100 text-green-800" }
        : { text: "Inactive", classes: "bg-gray-100 text-gray-800" };

    return <span className={`${baseClasses} ${status.classes}`}>{status.text}</span>;
};

// Function to format the date
const formatDate = (dateObject) => {
    if (!dateObject) return "N/A";
    return new Date(dateObject).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
};

// --- IMPROVED COMPONENT FOR SUBSCRIPTION DATE ---
const SubscriptionDateInfo = ({ assinatura }) => {
    if (!assinatura) return null;

    const { ativa, dataFim, nomePlano } = assinatura;

    // Explicitly check for a lifetime plan
    if (nomePlano && nomePlano.toLowerCase().includes('lifetime')) {
        return (
            <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-medium text-gray-800">Lifetime</p>
            </div>
        );
    }
    
    if (!dataFim) return null; // Can't show date info if no date exists

    const now = new Date();
    const endDate = new Date(dataFim);
    let labelText = '';

    if (ativa) {
        // Active subscription: it's a renewal date
        labelText = 'Renews on';
    } else {
        // Inactive subscription: check if it's expired or will expire
        if (endDate < now) {
            labelText = 'Expired on';
        } else {
            labelText = 'Access available until';
        }
    }

    return (
        <div>
            <p className="text-sm text-gray-500">{labelText}</p>
            <p className="font-medium text-gray-800">{formatDate(endDate)}</p>
        </div>
    );
};


// --- MAPPING AND CALCULATION LOGIC ---

// Function to map the plan ID to a readable name
const mapPlanIdToName = (planId) => {
    const planMap = {
        'pri_01k2031dkdfgv543j9mqexxsx1': 'Basic Plan (Monthly)',
        'pri_01k2030km2r709jt8ahcb2w3pr': 'Basic Plan (Annual)',
        'pri_01k202xz8xr4xkcem4s29rp2hc': 'Pro Plan (Monthly)',
        'pri_01k202ws5vhw8yd3fts8y8jw66': 'Pro Plan (Annual)',
        'pri_01k2032px4vc7nvy9vvrct6dhe': 'Pro Plan (Lifetime)',
    };
    return planMap[planId] || "Unknown Plan";
};

// Function to calculate the expiration date based on the plan
const calculateExpirationDate = (creationTimestamp, planId) => {
    if (!creationTimestamp) return null;
    const creationDate = creationTimestamp.toDate();
    
    const annualPlans = ['pri_01k2030km2r709jt8ahcb2w3pr', 'pri_01k202ws5vhw8yd3fts8y8jw66'];
    const monthlyPlans = ['pri_01k2031dkdfgv543j9mqexxsx1', 'pri_01k202xz8xr4xkcem4s29rp2hc'];
    const lifetimePlans = ['pri_01k2032px4vc7nvy9vvrct6dhe'];

    if (annualPlans.includes(planId)) {
        creationDate.setFullYear(creationDate.getFullYear() + 1);
        return creationDate;
    }
    if (monthlyPlans.includes(planId)) {
        creationDate.setMonth(creationDate.getMonth() + 1);
        return creationDate;
    }
    if (lifetimePlans.includes(planId)) {
        return null;
    }
    return null;
};

// --- MAIN PAGE COMPONENT ---
export default function PerfilPage() {
    const router = useRouter();
    const [sidebarAberta, setSidebarAberta] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [profile, setProfile] = useState(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [passwordResetSent, setPasswordResetSent] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    const docRef = doc(db, 'users', currentUser.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const userProfile = {
                            uid: currentUser.uid,
                            nome: data.nome,
                            email: data.email,
                            assinatura: null
                        };

                        if (data.plano && data.hasOwnProperty('assinaturaAtiva')) {
                            const expirationDate = calculateExpirationDate(data.criadoEm, data.plano);
                            userProfile.assinatura = {
                                ativa: data.assinaturaAtiva,
                                nomePlano: mapPlanIdToName(data.plano),
                                dataFim: expirationDate,
                                portalClienteUrl: data.paddleCustomerPortal || null
                            };
                        }
                        setProfile(userProfile);
                    } else {
                        setError("Profile not found in the database.");
                    }
                } catch (err) {
                    console.error("Error fetching profile from Firestore:", err);
                    setError("Could not load your profile data.");
                }
            } else {
                router.push('/home');
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [router]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Error during logout:', error);
            setError('Failed to log out. Please try again.');
        }
    };

    const handlePasswordReset = async () => {
        if (!profile?.email) return;
        try {
            await sendPasswordResetEmail(auth, profile.email);
            setPasswordResetSent(true);
            setTimeout(() => setPasswordResetSent(false), 5000);
        } catch (error) {
            console.error("Error sending password reset email:", error);
            setError("Could not send the email. Please try again later.");
        }
    };

    const handleManageSubscription = () => {
        if (profile?.assinatura?.portalClienteUrl) {
            router.push(profile.assinatura.portalClienteUrl);
        } else {
            alert("Management URL not found.");
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-gray-100"><LoadingSpinner /></div>;
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Topbar />
            <div className="md:hidden p-2 bg-white shadow z-40">
                <button
                    onClick={() => setSidebarAberta(!sidebarAberta)}
                    className="text-purple-700 font-bold text-xl"
                >
                    ☰
                </button>
            </div>
            <div className="flex flex-1">
                <div className={`fixed md:static z-50 transition-transform duration-300 transform bg-white shadow-lg md:shadow-none h-full md:h-auto ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                    <Sidebar />
                </div>
                <main className="flex-1 bg-gray-50 p-4 sm:p-6 lg:p-8">
                    {profile ? (
                        <div className="max-w-4xl mx-auto">
                            <h1 className="text-3xl font-bold text-gray-800 mb-2">My Account</h1>
                            <p className="text-gray-500 mb-8">Manage your information, subscription, and security.</p>
                            {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-6">{error}</p>}
                            <div className="space-y-8">
                                {/* Card: Profile Details */}
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                    <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
                                        <UserCircleIcon className="w-6 h-6 mr-2 text-purple-600" />
                                        Profile Details
                                    </h2>
                                    <div className="space-y-4">
                                        <div className="flex items-center">
                                            <EnvelopeIcon className="w-5 h-5 mr-3 text-gray-400" />
                                            <div>
                                                <p className="text-sm text-gray-500">Email</p>
                                                <p className="font-medium text-gray-800">{profile.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <UserCircleIcon className="w-5 h-5 mr-3 text-gray-400" />
                                            <div>
                                                <p className="text-sm text-gray-500">Name</p>
                                                <p className="font-medium text-gray-800">{profile.nome || 'Not defined'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Card: My Subscription (IMPROVED) */}
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                    <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
                                        <SparklesIcon className="w-6 h-6 mr-2 text-purple-600" />
                                        My Subscription
                                    </h2>
                                    {profile.assinatura ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-gray-500">Current Plan</p>
                                                    <p className="font-medium text-gray-800 text-lg">{profile.assinatura.nomePlano}</p>
                                                </div>
                                                <StatusBadge isActive={profile.assinatura.ativa} />
                                            </div>
                                            {/* ===== MODIFICATION START ===== */}
                                            <div className="flex items-center">
                                                <CalendarDaysIcon className="w-5 h-5 mr-3 text-gray-400" />
                                                <SubscriptionDateInfo assinatura={profile.assinatura} />
                                            </div>
                                            {/* ===== MODIFICATION END ===== */}

                                            {profile.assinatura.portalClienteUrl === "VITALICIO" ? (
                                                <div className="border-t pt-4 mt-4 text-center">
                                                    <p className="text-green-700 font-semibold">
                                                        Lifetime plan does not require management 🎉
                                                    </p>
                                                </div>
                                            ) : profile.assinatura.portalClienteUrl ? (
                                                <div className="border-t pt-4 mt-4">
                                                    <button
                                                        onClick={handleManageSubscription}
                                                        className="w-full px-4 py-2.5 bg-purple-600 text-white font-semibold rounded-lg shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                                                    >
                                                        Manage Subscription and Invoices
                                                    </button>
                                                    <p className="text-center text-sm text-gray-500 mt-2">
                                                        You will be redirected to our payment portal to change your plan,
                                                        update payment details, or cancel your subscription.
                                                    </p>
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <p className="text-gray-600">You do not have an active subscription.</p>
                                    )}
                                </div>
                                
                                {/* Other cards remain the same... */}
                                {/* Card: Security */}
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                    <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
                                        <ShieldCheckIcon className="w-6 h-6 mr-2 text-purple-600" />
                                        Security
                                    </h2>
                                    <div className="flex justify-between items-center">
                                        <p className="text-gray-600">Change your password via email.</p>
                                        <button
                                            onClick={handlePasswordReset}
                                            className="px-4 py-2 bg-gray-100 text-gray-800 font-semibold rounded-md hover:bg-gray-200 transition-colors"
                                        >
                                            Reset Password
                                        </button>
                                    </div>
                                    {passwordResetSent && <p className="text-sm text-green-600 mt-3">✅ Password reset email sent successfully to {profile?.email}!</p>}
                                </div>

                                {/* Card: Danger Zone */}
                                <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-red-200">
                                    <h2 className="text-xl font-semibold text-red-600 mb-4 flex items-center">
                                        <ExclamationTriangleIcon className="w-6 h-6 mr-2" />
                                        Danger Zone
                                    </h2>
                                    <div
                                        onClick={() => setShowLogoutConfirm(true)}
                                        className="cursor-pointer flex justify-between items-center p-3 rounded-md hover:bg-gray-50 transition-colors"
                                    >
                                        <div>
                                            <h3 className="font-semibold text-gray-800">Log Out of Account</h3>
                                            <p className="text-sm text-gray-500">End your current session on all devices.</p>
                                        </div>
                                        <ArrowRightOnRectangleIcon className="w-6 h-6 text-gray-500" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        !loading && <p className="text-center text-gray-500">Could not load the profile.</p>
                    )}
                </main>
            </div>

            {/* Confirmation Modals */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Are you sure you want to log out?</h3>
                        <p className="text-gray-600 mb-6">You will need to log in again to access your account.</p>
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 font-semibold"
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}