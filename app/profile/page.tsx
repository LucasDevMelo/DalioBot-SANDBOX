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
    <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
    </div>
);

// Function to format the date
const formatDate = (date) => {
    if (!date) return "N/A";
    return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
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

                                {/* Card: Beta Status */}
                                <div className="bg-purple-50 p-6 rounded-xl shadow-sm border border-purple-200">
                                    <h2 className="text-xl font-semibold text-purple-700 mb-4 flex items-center">
                                        <SparklesIcon className="w-6 h-6 mr-2 text-purple-600" />
                                        Beta Access
                                    </h2>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm text-purple-500">Plan</p>
                                            <p className="font-medium text-purple-800">Free Beta Access</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-purple-500">Status</p>
                                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full inline-block bg-purple-200 text-purple-800">Active</span>
                                        </div>
                                    </div>
                                </div>
                                
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