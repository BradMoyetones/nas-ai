'use client';

import ThemeIcon from '@/components/icons/theme-icon';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useTheme } from 'next-themes';
import { UserNav } from '@/components/user-nav';

export default function Header() {
    const { theme, setTheme } = useTheme();
    return (
        <header className="sticky top-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-50">
            <div className="flex items-center justify-between px-2 py-2 w-full">
                <div className="flex items-center gap-2">
                    <SidebarTrigger />
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                        <ThemeIcon />
                    </Button>
                    <UserNav />
                </div>
            </div>
        </header>
    );
}
