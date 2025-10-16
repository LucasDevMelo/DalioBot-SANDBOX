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
    sendPasswordResetEmail
} from 'firebase/auth';

// Importing icons
import {
    UserCircleIcon,
    EnvelopeIcon,
    ShieldCheckIcon,
    ArrowRightOnRectangleIcon,
    ExclamationTriangleIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';

// --- HELPERS AND SMALL COMPONENTS ---

// Loading Spinner Component for loading feedback
const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-full p-8">
      <svg className="animate-spin h-12 w-12 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
);


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
                        };
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

    if (loading) {
        return <div className="min-h-screen bg-slate-900"><LoadingSpinner /></div>;
    }

    return (
        <div className="min-h-screen flex flex-col bg-slate-900 text-gray-200">
            <Topbar />
            <div className="md:hidden p-2 bg-slate-800/50 border-b border-slate-700 shadow z-40">
                <button
                    onClick={() => setSidebarAberta(!sidebarAberta)}
                    className="text-purple-400 font-bold text-xl p-2"
                >
                    ☰
                </button>
            </div>
            <div className="flex flex-1 overflow-hidden">
                <div className={`fixed md:static z-50 transition-transform duration-300 transform bg-slate-900 border-r border-slate-800 shadow-lg md:shadow-none h-full md:h-auto ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                    <Sidebar />
                </div>
                <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
                    {profile ? (
                        <div className="max-w-4xl mx-auto">
                            <h1 className="text-3xl font-bold text-white mb-2">My Account</h1>
                            <p className="text-gray-400 mb-8">Manage your information, subscription, and security.</p>
                            
                            {error && <p className="bg-red-900/50 border border-red-500 text-red-400 p-3 rounded-lg mb-6">{error}</p>}
                            
                            <div className="space-y-8">
                                {/* Card: Profile Details */}
                                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl shadow-lg">
                                    <h2 className="text-xl font-semibold text-white mb-5 flex items-center">
                                        <UserCircleIcon className="w-6 h-6 mr-3 text-purple-400" />
                                        Profile Details
                                    </h2>
                                    <div className="space-y-4">
                                        <div className="flex items-center">
                                            <EnvelopeIcon className="w-5 h-5 mr-4 text-gray-500" />
                                            <div>
                                                <p className="text-sm text-gray-400">Email</p>
                                                <p className="font-medium text-gray-200">{profile.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <UserCircleIcon className="w-5 h-5 mr-4 text-gray-500" />
                                            <div>
                                                <p className="text-sm text-gray-400">Name</p>
                                                <p className="font-medium text-gray-200">{profile.nome || 'Not defined'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Card: Beta Status */}
                                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl shadow-lg">
                                    <h2 className="text-xl font-semibold text-white mb-5 flex items-center">
                                        <SparklesIcon className="w-6 h-6 mr-3 text-purple-400" />
                                        Beta Access
                                    </h2>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm text-gray-400">Plan</p>
                                            <p className="font-medium text-gray-200">Free Beta Access</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Status</p>
                                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full inline-block bg-purple-500/20 text-purple-300">Active</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Card: Security */}
                                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl shadow-lg">
                                    <h2 className="text-xl font-semibold text-white mb-5 flex items-center">
                                        <ShieldCheckIcon className="w-6 h-6 mr-3 text-purple-400" />
                                        Security
                                    </h2>
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                        <p className="text-gray-400">Change your password via email.</p>
                                        <button
                                            onClick={handlePasswordReset}
                                            className="px-4 py-2 bg-slate-700 text-gray-200 font-semibold rounded-lg hover:bg-slate-600 transition-colors"
                                        >
                                            Reset Password
                                        </button>
                                    </div>
                                    {passwordResetSent && <p className="text-sm text-green-400 mt-4">✅ Password reset email sent successfully to {profile?.email}!</p>}
                                </div>

                                {/* Card: Danger Zone */}
                                <div className="bg-transparent p-6 rounded-2xl border-2 border-red-500/50">
                                    <h2 className="text-xl font-semibold text-red-400 mb-4 flex items-center">
                                        <ExclamationTriangleIcon className="w-6 h-6 mr-3" />
                                        Danger Zone
                                    </h2>
                                    <div
                                        onClick={() => setShowLogoutConfirm(true)}
                                        className="cursor-pointer flex justify-between items-center p-3 rounded-lg hover:bg-slate-800/60 transition-colors"
                                    >
                                        <div>
                                            <h3 className="font-semibold text-gray-200">Log Out of Account</h3>
                                            <p className="text-sm text-gray-400">End your current session on all devices.</p>
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

            {/* Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl max-w-sm w-11/12">
                        <h3 className="text-lg font-semibold text-white mb-4">Are you sure you want to log out?</h3>
                        <p className="text-gray-400 mb-6">You will need to log in again to access your account.</p>
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="px-4 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
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