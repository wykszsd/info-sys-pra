import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';

// Layouts and Route Guard
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import ProtectedRoute from './routes/ProtectedRoute';

// Common Pages
import LoadingPage from './pages/LoadingPage';
import NotFoundPage from './pages/NotFoundPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import DashboardPage from './pages/DashboardPage'; // Simple placeholder

// Feature Pages (Lazy Loaded)
const LoginPage = lazy(() => import('./features/auth/components/LoginPage'));
// Student
const TimetablePage = lazy(() => import('./features/timetable/TimetablePage'));
const EmptyClassroomPage = lazy(() => import('./features/classrooms/EmptyClassroomPage'));
const CourseSelectionPage = lazy(() => import('./features/courses/CourseSelectionPage'));
const MyExamsPage = lazy(() => import('./features/exams/MyExamsPage'));
// Teacher
const MyCoursesPage = lazy(() => import('./features/teacher/MyCoursesPage'));
const SubmitRequestPage = lazy(() => import('./features/requests/SubmitRequestPage'));
const MyRequestsPage = lazy(() => import('./features/requests/MyRequestsPage'));
const AssignmentPage = lazy(() => import('./features/assignments/AssignmentPage'));
// Admin
const AdminDashboardPage = lazy(() => import('./features/admin/AdminDashboardPage'));
const AdminCourseManagementPage = lazy(() => import('./features/admin/courses/AdminCourseManagementPage'));
const AdminClassroomManagementPage = lazy(() => import('./features/admin/classrooms/AdminClassroomManagementPage'));
const AdminSemesterManagementPage = lazy(() => import('./features/admin/semesters/AdminSemesterManagementPage'));
const AdminUserManagementPage = lazy(() => import('./features/admin/users/AdminUserManagementPage'));
const AdminScheduleManagementPage = lazy(() => import('./features/admin/schedules/AdminScheduleManagementPage'));
const AdminRequestApprovalPage = lazy(() => import('./features/admin/requests/AdminRequestApprovalPage'));
// Shared
const NotificationsPage = lazy(() => import('./features/notifications/NotificationsPage'));


// Suspense Wrapper for lazy loaded components
const SuspenseWrapper = (Component: React.LazyExoticComponent<React.FC<{}>>) => (
    <Suspense fallback={<LoadingPage />}>
        <Component />
    </Suspense>
);

// Root Redirect Component
function RootRedirect() {
    const token = localStorage.getItem('authToken'); // Simplistic check, Redux state is better if available early
    return <Navigate to={token ? "/app" : "/login"} replace />;
}

const routesConfig = [
    // Public Routes
    {
        element: <AuthLayout />,
        children: [
            { path: 'login', element: SuspenseWrapper(LoginPage) },
        ],
    },
    // Protected Application Routes
    {
        path: '/app',
        element: <ProtectedRoute><MainLayout /></ProtectedRoute>, // ProtectedRoute wraps MainLayout
        children: [
            // { index: true, element: SuspenseWrapper(DashboardPage) }, // 旧代码
            { index: true, element: <DashboardPage /> }, // 修改后：直接使用 DashboardPage
            { path: 'notifications', element: SuspenseWrapper(NotificationsPage) },
            { path: 'unauthorized', element: <UnauthorizedPage /> }, // No need to lazy load this simple page
            {
                // These routes are accessible by both students and teachers
                element: <ProtectedRoute allowedRoles={['student', 'teacher']}><Outlet /></ProtectedRoute>,
                children: [
                    { path: 'timetable', element: SuspenseWrapper(TimetablePage) },
                    { path: 'find-classrooms', element: SuspenseWrapper(EmptyClassroomPage) },
                    { path: 'my-exams', element: SuspenseWrapper(MyExamsPage) },
                ]
            },
            // Student Routes
            {
                element: <ProtectedRoute allowedRoles={['student']}><Outlet /></ProtectedRoute>,
                children: [

                    { path: 'select-courses', element: SuspenseWrapper(CourseSelectionPage) }

                ],
            },
            // Teacher Routes
            {
                element: <ProtectedRoute allowedRoles={['teacher']}><Outlet /></ProtectedRoute>,
                children: [
                    { path: 'my-courses-taught', element: SuspenseWrapper(MyCoursesPage) }, // Renamed for clarity
                    { path: 'timetable', element: SuspenseWrapper(TimetablePage) }, // Teachers also see timetable

                    { path: 'submit-request', element: SuspenseWrapper(SubmitRequestPage) },
                    { path: 'my-requests', element: SuspenseWrapper(MyRequestsPage) },
                    { path: 'assignments/post', element: SuspenseWrapper(AssignmentPage) } // Renamed for clarity

                ],
            },
            // Admin Routes
            {
                element: <ProtectedRoute allowedRoles={['admin']}><Outlet /></ProtectedRoute>,
                children: [
                    { path: 'admin-dashboard', element: SuspenseWrapper(AdminDashboardPage) },
                    { path: 'admin/courses', element: SuspenseWrapper(AdminCourseManagementPage) },
                    { path: 'admin/classrooms', element: SuspenseWrapper(AdminClassroomManagementPage) },
                    { path: 'admin/semesters', element: SuspenseWrapper(AdminSemesterManagementPage) },
                    { path: 'admin/users', element: SuspenseWrapper(AdminUserManagementPage) },
                    { path: 'admin/schedules', element: SuspenseWrapper(AdminScheduleManagementPage) },
                    { path: 'admin/requests', element: SuspenseWrapper(AdminRequestApprovalPage) },
                ],
            },
        ],
    },
    // Root Path and Not Found
    { path: '/', element: <RootRedirect /> },
    { path: '*', element: <NotFoundPage /> },
];

export const router = createBrowserRouter(routesConfig);