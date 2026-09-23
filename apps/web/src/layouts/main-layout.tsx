import { Outlet, useNavigate } from "react-router";
import { useAuth } from "@/contexts/auth-context";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/sidebar";
import Header from "./components/header";
import { Suspense } from "react";
import { Loader } from "@/components/loader";

const LoadingScreen = () => {
    return (
        <div className="grid min-h-screen w-full place-items-center">
            <Loader />
        </div>
    );
}

export default function MainLayout() {
    const { user, isLoading } = useAuth();
    const navigate = useNavigate();


    if (isLoading) return <LoadingScreen />;

    if (!user) {
        navigate('/login');
        return null;
    }

    return (
        <SidebarProvider defaultOpen={document.cookie.includes('sidebar_state=true')}>
            <AppSidebar />
            <SidebarInset>
                <Header />
                <main className="flex flex-1 flex-col w-full @container">
                    <Suspense fallback={<LoadingScreen />}>
                        <Outlet />
                    </Suspense>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}