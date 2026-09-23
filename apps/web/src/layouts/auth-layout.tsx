
import { cn } from "cn"
import { Outlet, useNavigate } from "react-router"
import { Suspense } from "react"
import { Loader } from "@/components/loader"
import { useAuth } from "@/contexts/auth-context"

const LoadingScreen = () => {
    return (
        <div className="grid min-h-screen w-full place-items-center">
            <Loader />
        </div>
    );
}

export function AuthLayout({ className, ...props }: Omit<React.ComponentProps<'div'>, 'children'>) {
    const { user, isLoading } = useAuth();
    const navigate = useNavigate();


    if (isLoading) return <LoadingScreen />;

    if (user) {
        navigate('/');
        return null;
    }

    return (
        <div className={cn("min-h-screen flex flex-col", className)} {...props}>
            <Suspense fallback={<LoadingScreen />}>
                <Outlet />
            </Suspense>
        </div>
    )
}