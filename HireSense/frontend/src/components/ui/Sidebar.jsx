import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, UploadCloud, Users, Settings, LogOut, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Analyze Resume', path: '/analyze', icon: UploadCloud },
    { name: 'Recruiter Mode', path: '/recruiter', icon: Users },
    { name: 'History', path: '/history', icon: FileText },
    { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
    const location = useLocation();
    const { user, signOut } = useAuth();

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Failed to log out', error);
        }
    };

    return (
        <div className="w-64 h-full bg-white dark:bg-[#0f0f0f] border-r border-gray-200 dark:border-gray-800 flex flex-col transition-colors duration-300">
            <div className="p-6 flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <span className="text-white font-bold text-xl">H</span>
                </div>
                <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600 tracking-tight">
                    HireSense
                </span>
            </div>


            <nav className="flex-1 px-4 space-y-2 mt-4">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link key={item.name} to={item.path} className="relative block">
                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-active"
                                    className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 rounded-xl"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            <div className={`relative px-4 py-3 flex items-center space-x-3 rounded-xl transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                                <item.icon className="w-5 h-5" />
                                <span>{item.name}</span>
                            </div>
                        </Link>
                    );
                })}

                {/* Owner Only: Master Vault Link */}
                {user?.email === 'aditya.poddar3698@gmail.com' && (
                    <Link to="/admin" className="relative block mt-6">
                        {location.pathname === '/admin' && (
                            <motion.div
                                layoutId="sidebar-active"
                                className="absolute inset-0 bg-amber-500/10 rounded-xl"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        )}
                        <div className={`relative px-4 py-3 flex items-center space-x-3 rounded-xl transition-colors ${location.pathname === '/admin' ? 'text-amber-500 font-medium' : 'text-amber-600/70 hover:text-amber-500 hover:bg-amber-500/10'}`}>
                            <Shield className="w-5 h-5" />
                            <span>Security Vault</span>
                        </div>
                    </Link>
                )}
            </nav>

            <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <Link to="/profile" className="flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-xl transition-colors flex-1">
                    <img 
                        src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${user?.id}&backgroundColor=b6e3f4,c0aede,d1d4f9`} 
                        alt="Profile" 
                        className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 bg-white" 
                        onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/notionists/svg?seed=${user?.id}`; }}
                    />
                    <div className="flex flex-col truncate">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.user_metadata?.display_name || user?.email?.split('@')[0]}</span>
                    </div>
                </Link>
                <button 
                    onClick={handleLogout}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    title="Logout"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
