# NAS AI Platform

Plataforma de conversación con múltiples proveedores de IA.

## Estructura

```
nas-api/
├── apps/
│   ├── api/          # Backend (Express + Prisma + SQLite)
│   └── web/          # Frontend (React 19 + Vite + Tailwind)
├── packages/
│   └── shared/       # Tipos compartidos entre apps
├── package.json      # Workspace root
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## Desarrollo

```bash
# Instalar dependencias
pnpm install

# Iniciar ambos proyectos
pnpm dev

# Iniciar solo el backend
pnpm dev:api

# Iniciar solo el frontend
pnpm dev:web
```

## Apps

- **`@nas/api`** — API backend con streaming SSE, autenticación JWT+2FA, multi-proveedor IA
- **`@nas/web`** — SPA con chat en tiempo real, selector de modelos, renderizado markdown

## Packages

- **`@nas/shared`** — Tipos TypeScript compartidos: proveedores, modelos, mensajes, eventos de streaming
