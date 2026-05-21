import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import VortexLoader from './ui/VortexLoader';

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    const [showLoader, setShowLoader] = useState(true);
    const [isExitTriggered, setIsExitTriggered] = useState(false);

    useEffect(() => {
        if (!loading) {
            // Trigger the portal exit zoom/blur transition
            setIsExitTriggered(true);
            const timer = setTimeout(() => {
                setShowLoader(false);
            }, 600); // Wait for the transition to complete (600ms match)
            return () => clearTimeout(timer);
        }
    }, [loading]);

    if (showLoader) {
        return <VortexLoader isExitTriggered={isExitTriggered} />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

