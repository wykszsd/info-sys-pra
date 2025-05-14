import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { RootState } from '../store';
import type { UserRole } from '../types';
import LoadingPage from '../pages/LoadingPage'; // Import LoadingPage

interface ProtectedRouteProps {
    children?: React.ReactNode; // For wrapping layouts directly
    allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { isAuthenticated, user, isLoading: authIsLoading } = useSelector((state: RootState) => state.auth);
    const location = useLocation();

    // If auth state is still loading (e.g., initial token check or fetchUserOnLoad)
    if (authIsLoading && !isAuthenticated && localStorage.getItem('authToken')) {
        return <LoadingPage />; // Show loading screen
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        console.warn(`Access Denied: User role "${user.role}" not in allowed roles "${allowedRoles.join(', ')}" for ${location.pathname}`);
        return <Navigate to="/app/unauthorized" replace />;
    }

    // If children prop is provided, render it (e.g., when <ProtectedRoute><MainLayout /></ProtectedRoute>)
    // Otherwise, render <Outlet /> for nested routes
    return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;