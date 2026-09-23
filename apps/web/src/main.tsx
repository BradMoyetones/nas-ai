import '@/styles/globals.css'
import "streamdown/styles.css";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import router from '@/router'
import { ThemeProvider } from "next-themes"
import { AuthProvider } from './contexts/auth-context'
import queryClient from '@/lib/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from "@/components/ui/sonner"

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <RouterProvider router={router} />
                </AuthProvider>
            </QueryClientProvider>
            <Toaster />
        </ThemeProvider>
    </StrictMode>,
)
