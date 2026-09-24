'use client';

import { cn } from 'cn';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authService } from '@/lib/axios';
import { useAuth } from '@/contexts/auth-context';
import { useSearchParams } from 'react-router';
import { authCodeVerifySchema, authLoginSchema, type AuthCodeVerifyFormValues, type AuthLoginFormValues } from '@/services/auth/types';
import type { LoginChallenge } from '@/types/models';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { Card, CardContent } from '@/components/ui/card';

export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
    const [challenge, setChallenge] = useState<Pick<LoginChallenge, 'id' | 'expiresAt'> | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const { refreshUser } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    const form1 = useForm<AuthLoginFormValues>({
        resolver: zodResolver(authLoginSchema),
        defaultValues: { email: '', password: '' },
    });

    const form2 = useForm<AuthCodeVerifyFormValues>({
        resolver: zodResolver(authCodeVerifySchema),
        defaultValues: { code: '' },
    });

    const onStep1Submit = async (values: AuthLoginFormValues) => {
        setErrorMsg(null);
        try {
            const response = await authService.login(values);
            form2.setValue('challengeId', response.challenge.id);
            setChallenge(response.challenge);
        } catch (error: any) {
            setErrorMsg(error?.response?.data?.error || 'Error al iniciar sesión');
        }
    };

    const onStep2Submit = async (values: AuthCodeVerifyFormValues) => {
        setErrorMsg(null);
        try {
            await authService.verifyLoginCode(values);
            await refreshUser();
        } catch (error: any) {
            setErrorMsg(error?.response?.data?.error || 'Error al verificar el código');
        }
    };

    const resetForm = () => {
        setChallenge(null);
        setErrorMsg(null);
        setSearchParams((prev) => {
            const nextParams = new URLSearchParams(prev);
            nextParams.delete('challengeId');
            return nextParams;
        });
        form1.reset();
        form2.reset();
    };

    useEffect(() => {
        if (challenge) {
            setSearchParams((prev) => {
                const nextParams = new URLSearchParams(prev);
                nextParams.set('challengeId', challenge.id);
                return nextParams;
            });
        }
    }, [challenge, setSearchParams]);

    useEffect(() => {
        const challengeId = searchParams.get('challengeId');
        if (challengeId) {
            authService.getLoginChallenge(challengeId).then((response) => {
                form2.setValue('challengeId', response.challenge.id);
                setChallenge(response.challenge);
            }).catch(() => {
                resetForm();
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, form2]);

    return (
        <Card className={cn(className)} {...props}>
            <CardContent>

                <FieldGroup>
                    <div className="flex flex-col items-center gap-2 text-center">
                        <Link to="/" className="flex flex-col items-center gap-2 font-medium">
                            <div className="flex size-30 items-center justify-center rounded-md">
                                <img src="/img/logo.png" alt="" />
                            </div>
                            <span className="sr-only">NAS AI</span>
                        </Link>
                        <h1 className="text-xl font-bold">
                            {challenge ? 'Verificación de Seguridad' : 'Bienvenido a NAS AI'}
                        </h1>
                        <FieldDescription>
                            {challenge ? (
                                'Ingresa el código enviado a tu correo'
                            ) : (
                                <>
                                    ¿No tienes cuenta?{' '}
                                    <Link to="/register" className="underline">
                                        Regístrate
                                    </Link>
                                </>
                            )}
                        </FieldDescription>
                    </div>

                    {errorMsg && (
                        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md text-center">
                            {errorMsg}
                        </div>
                    )}

                    {!challenge ? (
                        <form onSubmit={form1.handleSubmit(onStep1Submit)} className="flex flex-col gap-5">
                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input id="email" type="email" placeholder="m@example.com" {...form1.register('email')} />
                                <FieldError errors={[form1.formState.errors.email]} />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="********"
                                    {...form1.register('password')}
                                />
                                <FieldError errors={[form1.formState.errors.password]} />
                            </Field>
                            <Field>
                                <Button type="submit" disabled={form1.formState.isSubmitting}>
                                    {form1.formState.isSubmitting ? (
                                        <Loader2 className="animate-spin h-4 w-4" />
                                    ) : (
                                        'Iniciar Sesión'
                                    )}
                                </Button>
                            </Field>
                        </form>
                    ) : (
                        <form onSubmit={form2.handleSubmit(onStep2Submit)} className="flex flex-col gap-5 w-fit mx-auto">
                            <Field className='mx-auto w-fit'>
                                <FieldLabel htmlFor="code">Código 2FA</FieldLabel>
                                <InputOTP
                                    maxLength={6}
                                    id='code'
                                    {...form2.register('code')}
                                    onChange={(value) => form2.setValue('code', value)}
                                >
                                    <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                                        <InputOTPSlot index={0} />
                                        <InputOTPSlot index={1} />
                                        <InputOTPSlot index={2} />
                                    </InputOTPGroup>
                                    <InputOTPSeparator />
                                    <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                                        <InputOTPSlot index={3} />
                                        <InputOTPSlot index={4} />
                                        <InputOTPSlot index={5} />
                                    </InputOTPGroup>
                                </InputOTP>
                                <FieldError errors={[form2.formState.errors.code]} />
                            </Field>
                            <Field>
                                <Button type="submit" disabled={form2.formState.isSubmitting}>
                                    {form2.formState.isSubmitting ? (
                                        <Loader2 className="animate-spin h-4 w-4" />
                                    ) : (
                                        'Verificar Código'
                                    )}
                                </Button>
                            </Field>
                            <Button type="button" variant="ghost" onClick={() => setChallenge(null)}>
                                Volver al login
                            </Button>
                        </form>
                    )}
                </FieldGroup>
            </CardContent>
        </Card>
    );
}
