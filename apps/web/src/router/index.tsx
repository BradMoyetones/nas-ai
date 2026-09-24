import { createBrowserRouter, isRouteErrorResponse, useRouteError } from "react-router"

// Layouts
import MainLayout from "@/layouts/main-layout"
import { AuthLayout } from "@/layouts/auth-layout"

// Pages
import Chat from "@/pages/(chat)"
import Login from "@/pages/(auth)/login/page"
import Register from "@/pages/(auth)/register/page"
import VerifyEmailPage from "@/pages/(auth)/verify-email/page"
import { ErrorBoundary } from "@/components/error-boundary"

import Settings from "@/pages/(settings)"
import ProvidersPage from "@/pages/(settings)/router/providers"
import ProfilePage from "@/pages/(settings)/router/profile"

function RouterErrorThrower(): React.ReactNode {
    const error = useRouteError();

    if (isRouteErrorResponse(error)) {
        throw new Error(`${error.status} ${error.statusText}: ${error.data}`);
    }

    if (error instanceof Error) {
        throw error;
    }

    throw new Error(typeof error === 'string' ? error : JSON.stringify(error));
}

const router = createBrowserRouter([
    {
        path: "/",
        element: <MainLayout />,
        errorElement: (
            <ErrorBoundary>
                <RouterErrorThrower />
            </ErrorBoundary>
        ),
        children: [
            {
                index: true,
                element: <Chat />,
            },
            {
                path: 'settings',
                element: <Settings />,
                children: [
                    {
                        index: true,
                        element: <ProfilePage />,
                    },
                    {
                        path: 'api-keys',
                        element: <ProvidersPage />,
                    },
                ],
            },
            {
                path: ':conversationId',
                element: <Chat />,
            }
        ],
    },
    {
        element: <AuthLayout />,
        children: [
            {
                path: '/login',
                element: <Login />,
            },
            {
                path: '/register',
                element: <Register />,
            },
            {
                path: '/verify-email',
                element: <VerifyEmailPage />,
            },
        ]
    },
])

export default router