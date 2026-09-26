import { Suspense } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Loader } from "@/components/loader";
import { cn } from "cn";
import { KeyIcon, Settings, UserIcon } from "lucide-react";

const ROUTES = [
    {
        icon: Settings,
        title: "Settings",
        href: "/settings",
    },
    {
        icon: UserIcon,
        title: "Profile",
        href: "/settings/profile",
    },
    {
        icon: KeyIcon,
        title: "API Keys",
        href: "/settings/api-keys",
    },
]

export default function SettingsPage() {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <div className="space-y-4 flex flex-1 flex-col w-full h-full p-4">
            <div>
                <h1 className="text-xl font-bold">Settings</h1>
                <p className="text-muted-foreground">Manage your application settings.</p>
            </div>

            <Select
                defaultValue={location.pathname}
                value={location.pathname}
                onValueChange={(value) => { if (value) navigate(value) }}
            >
                <SelectTrigger className="w-full mb-6 xl:hidden">
                    <SelectValue placeholder="Ajustes" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {ROUTES.map((link) => (
                            <SelectItem
                                key={"settings-select-" + link.href}
                                value={link.href}
                            >
                                <link.icon />
                                {link.title}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
            <div className="flex flex-1 space-x-2">
                <AsideContent>
                    {ROUTES.map((link) => (
                        <AsideItem
                            key={link.href}
                            to={link.href}
                        >
                            <link.icon />
                            {link.title}
                        </AsideItem>
                    ))}
                </AsideContent>
                <div className="flex-1 flex flex-col w-full @container">
                    <Suspense fallback={<div className="flex-1 flex flex-col items-center justify-center"><Loader /></div>}>
                        <Outlet />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}

const AsideContent = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="hidden mt-1 xl:block min-w-60">
            <div className="list-none sticky top-16">
                {children}
            </div>
        </div>
    )
}

const AsideItem = ({ to, className, ...props }: React.ComponentProps<typeof Link>) => {
    const location = useLocation();
    const fullHref = to;
    const isActive = fullHref === location.pathname;

    return (
        <Link
            to={fullHref}
            className={cn(
                "py-2 px-3 border-l-2 border-l-transparent rounded-r-lg transition-all duration-300 text-sm font-medium flex gap-2 items-center text-muted-foreground [&>svg]:size-5",
                {
                    "text-primary border-l-2 border-primary bg-muted": isActive,
                    "hover:translate-x-2 ": !isActive

                },
                className
            )}
            {...props}
        />
    )
}