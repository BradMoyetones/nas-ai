'use client';

import { useEffect, useRef, useState } from 'react';
import { authService } from '@/lib/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { Suspense } from 'react';
import { Loader } from '@/components/loader';

function VerifyContent() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    const hasAttemptedVerification = useRef(false);

    useEffect(() => {
        if (!token) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setStatus('error');
            setMessage('No se proporcionó un token de verificación.');
            return;
        }

        if (hasAttemptedVerification.current) return;

        hasAttemptedVerification.current = true;

        const verify = async () => {
            try {
                const res = await authService.verifyEmail(token);
                setStatus('success');
                setMessage(res.message || 'Correo verificado exitosamente');
            } catch (err: any) {
                setStatus('error');
                setMessage(err?.response?.data?.error || 'El enlace es inválido o ha expirado.');
            }
        };

        verify();
    }, [token]);

    return (
        <Card className="max-w-md w-full border-none shadow-none bg-transparent">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold flex justify-center mb-2">
                    {status === 'loading' && <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />}
                    {status === 'success' && <CheckCircle2 className="h-12 w-12 text-green-500" />}
                    {status === 'error' && <XCircle className="h-12 w-12 text-destructive" />}
                </CardTitle>
                <CardDescription className="text-lg">
                    {status === 'loading' && 'Verificando tu correo electrónico...'}
                    {status === 'success' && '¡Cuenta Activada!'}
                    {status === 'error' && 'Error de Verificación'}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center text-center gap-6">
                <p className="text-muted-foreground">{message}</p>
                {status !== 'loading' && (
                    <Button asChild className="w-full">
                        <Link to="/login">Ir a Iniciar Sesión</Link>
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

export default function VerifyEmailPage() {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-md flex flex-col items-center bg-background rounded-xl p-6 shadow-sm border">
                <Suspense fallback={<Loader />}>
                    <VerifyContent />
                </Suspense>
            </div>
        </div>
    );
}
