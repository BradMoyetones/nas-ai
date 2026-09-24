'use client';

import { cn } from 'cn';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authService } from '@/lib/axios';
import { authRegisterSchema, type AuthRegisterFormValues } from '@/services/auth';
import { Card, CardContent } from '@/components/ui/card';

export function RegisterForm({ className, ...props }: React.ComponentProps<'div'>) {
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const form = useForm<AuthRegisterFormValues>({
        resolver: zodResolver(authRegisterSchema),
        defaultValues: { username: '', email: '', password: '' },
    });

    const onSubmit = async (values: AuthRegisterFormValues) => {
        setErrorMsg(null);
        try {
            await authService.register(values);
            setSuccess(true);
        } catch (error: any) {
            setErrorMsg(error?.response?.data?.error || 'Error al registrar usuario');
        }
    };

    if (success) {
        return (
            <div className={cn('flex flex-col items-center gap-6 py-8', className)} {...props}>
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">¡Registro Exitoso!</h2>
                    <p className="text-muted-foreground">
                        Hemos enviado un enlace de verificación a tu correo electrónico. Por favor revisa tu bandeja de
                        entrada para activar tu cuenta.
                    </p>
                </div>
                <Button asChild className="mt-4">
                    <Link to="/login">Ir al Login</Link>
                </Button>
            </div>
        );
    }

    return (
        <Card className={cn(className)} {...props}>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <FieldGroup>
                        <div className="flex flex-col items-center gap-2 text-center">
                            <Link to="/" className="flex flex-col items-center gap-2 font-medium">
                                <div className="flex size-30 items-center justify-center rounded-md">
                                    <img src="/img/logo.png" alt="" />
                                </div>
                                <span className="sr-only">NAS AI</span>
                            </Link>
                            <h1 className="text-xl font-bold">Crear Cuenta</h1>
                            <FieldDescription>
                                ¿Ya tienes una cuenta?{' '}
                                <Link to="/login" className="underline">
                                    Inicia Sesión
                                </Link>
                            </FieldDescription>
                        </div>

                        {errorMsg && (
                            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md text-center">
                                {errorMsg}
                            </div>
                        )}

                        <Controller
                            name="username"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="username">Nombre de Usuario</FieldLabel>
                                    <Input
                                        {...field}
                                        id="username"
                                        aria-invalid={fieldState.invalid}
                                        type="text"
                                        placeholder="johndoe"
                                        autoComplete="off"
                                    />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        <Controller
                            name="email"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="email">Email</FieldLabel>
                                    <Input
                                        {...field}
                                        id="email"
                                        aria-invalid={fieldState.invalid}
                                        type="email"
                                        placeholder="m@example.com"
                                        autoComplete="off"
                                    />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        <Controller
                            name="password"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                                    <Input
                                        {...field}
                                        id="password"
                                        aria-invalid={fieldState.invalid}
                                        type="password"
                                        placeholder="********"
                                        autoComplete="new-password"
                                    />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        <Field>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? (
                                    <Loader2 className="animate-spin h-4 w-4" />
                                ) : (
                                    'Crear Cuenta'
                                )}
                            </Button>
                        </Field>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    );
}
