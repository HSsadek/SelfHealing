import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import MainLayout from '../layouts/MainLayout';
import PageLoader from '../components/ui/PageLoader';

// Lazy-load every page for code splitting
const Home       = lazy(() => import('../pages/Home'));
const Analysis   = lazy(() => import('../pages/dashboard/Analysis'));
const Tests      = lazy(() => import('../pages/dashboard/Tests'));
const Security   = lazy(() => import('../pages/dashboard/Security'));
const Healing    = lazy(() => import('../pages/dashboard/Healing'));
const Autonomous = lazy(() => import('../pages/dashboard/Autonomous'));
const Evidence   = lazy(() => import('../pages/dashboard/Evidence'));
const Settings   = lazy(() => import('../pages/Settings'));
const NotFound   = lazy(() => import('../pages/NotFound'));

// Wrap each lazy page in a Suspense boundary at the route level
const withSuspense = (Component) => (
    <Suspense fallback={<PageLoader />}>
        <Component />
    </Suspense>
);

export const router = createBrowserRouter([
    // Public routes — wrapped in MainLayout
    {
        element: <MainLayout />,
        children: [
            { path: '/', element: withSuspense(Home) },
        ]
    },
    // Dashboard routes — wrapped in DashboardLayout
    {
        path: '/dashboard',
        element: <DashboardLayout />,
        children: [
            { index: true,              element: withSuspense(Analysis) },
            { path: 'analysis',         element: withSuspense(Analysis) },
            { path: 'tests',            element: withSuspense(Tests) },
            { path: 'security',         element: withSuspense(Security) },
            { path: 'healing',          element: withSuspense(Healing) },
            { path: 'autonomous',       element: withSuspense(Autonomous) },
            { path: 'evidence',         element: withSuspense(Evidence) },
        ]
    },
    // Shared layout-less page
    { path: '/settings',  element: withSuspense(Settings) },
    // Catch-all 404
    { path: '*',          element: withSuspense(NotFound) },
]);
