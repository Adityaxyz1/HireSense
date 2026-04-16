import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, UploadCloud, Users, Settings, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Analyze Resume', path: '/analyze', icon: UploadCloud },
    { name: 'Recruiter Mode', path: '/recruiter', icon: Users },
    { name: 'History', path: '/history', icon: FileText },
    { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
    const location = useLocation();

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
            </nav>

            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                <button className="flex items-center space-x-3 text-red-600 dark:text-red-400 px-4 py-3 w-full hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
}
