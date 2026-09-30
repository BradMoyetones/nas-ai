# NAS AI — Producción en Synology

Manual operativo del entorno de producción de **NAS AI** desplegado en Synology mediante Container Manager y Docker Compose.

Este documento describe la instalación actual y los procedimientos para:

* Administrar el repositorio.
* Actualizar backend y frontend.
* Gestionar Prisma y SQLite.
* Cambiar variables de entorno.
* Reiniciar/recrear servicios.
* Diagnosticar errores.
* Trabajar desde la terminal de Container Manager.
* Utilizar SSH únicamente como mecanismo administrativo de respaldo.

---

# 1. Arquitectura actual

El proyecto es un monorepo:

```text
nas-ai/
├── apps/
│   ├── api/                  # Hono + Node + Prisma
│   └── web/                  # Vite + React
├── packages/
│   └── shared/               # Tipos, schemas y utilidades compartidas
├── compose.yaml
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── turbo.json
└── ...
```

En el Synology el repositorio está en:

```text
/volume1/docker/nas-app/repo
```

Los datos persistentes de producción están en:

```text
/volume1/docker/nas-app/data/api
```

La estructura física es:

```text
/volume1/docker/nas-app/
├── data/
│   └── api/
│       └── database.sqlite
│
└── repo/
    ├── .env
    ├── compose.yaml
    ├── package.json
    ├── pnpm-lock.yaml
    ├── pnpm-workspace.yaml
    ├── turbo.json
    ├── apps/
    │   ├── api/
    │   └── web/
    └── packages/
        └── shared/
```

---

# 2. Containers

El entorno utiliza tres containers:

| Container     | Imagen         | Función                    |
| ------------- | -------------- | -------------------------- |
| `nas-ai-repo` | `node:latest`  | Git, pnpm, Prisma y builds |
| `nas-ai-api`  | `node:latest`  | API Hono                   |
| `nas-ai-web`  | `nginx:latest` | Servir React compilado     |

Las tres imágenes disponibles en Container Manager son:

```text
node:latest
nginx:latest
alpine/git:v2.54.0
```

No se utilizan imágenes personalizadas como:

```text
nas-ai/api
nas-ai/web
nas-ai/repo
```

Los nombres:

```text
nas-ai-repo
nas-ai-api
nas-ai-web
```

son nombres de **containers**, no de imágenes.

---

# 3. Direcciones actuales

El entorno actual es solamente LAN.

Frontend:

```text
http://192.168.20.122:8081
```

Backend:

```text
http://192.168.20.122:3000
```

Health check:

```text
http://192.168.20.122:3000/health
```

DSM:

```text
https://192.168.20.122:5001
```

Actualmente no se utiliza:

* Dominio.
* Reverse Proxy.
* HTTPS para la aplicación.
* QuickConnect para los servicios.
* Exposición pública de la aplicación.

---

# 4. Container `nas-ai-repo`

Este es el container utilizado para administrar el proyecto desde la terminal de Container Manager.

Su imagen es:

```text
node:latest
```

Su workspace:

```text
/workspace
```

corresponde al repositorio físico:

```text
/volume1/docker/nas-app/repo
```

Por tanto:

```text
NAS
/volume1/docker/nas-app/repo
        │
        │ bind mount
        ▼
nas-ai-repo
/workspace
```

---

# 5. Entrar al repo desde Container Manager

La forma normal de trabajar es:

```text
Container Manager
→ Containers
→ nas-ai-repo
→ Terminal
```

Shell:

```text
/bin/bash
```

Después:

```bash
cd /workspace
```

Comprobar:

```bash
pwd
```

Debe mostrar:

```text
/workspace
```

---

# 6. Git

Comprobar estado:

```bash
git status --short --branch
```

Esperado:

```text
## main...origin/main
```

Ver remoto:

```bash
git remote -v
```

Remoto:

```text
https://github.com/BradMoyetones/nas-ai
```

Ver rama:

```bash
git branch --show-current
```

Ver último commit:

```bash
git log -1 --oneline
```

---

# 7. Actualizar el repositorio

Desde:

```text
Container Manager
→ nas-ai-repo
→ Terminal
```

ejecutar:

```bash
cd /workspace
git pull --ff-only origin main
```

Después:

```bash
git status --short --branch
```

No se debe modificar código fuente directamente en producción.

El Mac es el origen del código:

```text
Mac
↓
git commit
↓
git push
↓
NAS
↓
git pull
```

---

# 8. Git temporal de emergencia

Si `nas-ai-repo` está detenido o no puede utilizarse, se puede usar temporalmente:

```text
alpine/git:v2.54.0
```

Desde SSH:

```bash
sudo docker run --rm \
  --user 1028:100 \
  -v /volume1/docker/nas-app/repo:/repo \
  alpine/git:v2.54.0 \
  -C /repo pull --ff-only origin main
```

Comprobar estado:

```bash
sudo docker run --rm \
  --user 1028:100 \
  -v /volume1/docker/nas-app/repo:/repo \
  alpine/git:v2.54.0 \
  -C /repo status --short --branch
```

Este método es solamente un mecanismo de recuperación.

La operación normal debe hacerse desde:

```text
nas-ai-repo
```

---

# 9. Usuario y permisos del NAS

SSH:

```bash
ssh "Brad Moyetones@192.168.20.122"
```

Comprobar identidad:

```bash
id
```

Actualmente el usuario es:

```text
UID: 1028
GID: 100
```

Comprobar usuario:

```bash
whoami
```

En este Synology el comando:

```bash
groups
```

puede no estar disponible.

Usar:

```bash
id
```

como referencia.

---

# 10. Docker en el Synology

Docker requiere `sudo`.

Correcto:

```bash
sudo docker ps
```

Incorrecto:

```bash
docker ps
```

porque el socket de Docker pertenece al sistema y el usuario de SSH no tiene acceso directo.

Comprobar Docker:

```bash
sudo docker info >/dev/null && echo "Docker OK"
```

---

# 11. Compose

El archivo principal es:

```text
/volume1/docker/nas-app/repo/compose.yaml
```

Trabajar desde:

```bash
cd /volume1/docker/nas-app/repo
```

Validar Compose:

```bash
sudo docker compose config --quiet
```

Si no imprime nada, la configuración es válida.

Ver servicios:

```bash
sudo docker compose ps
```

Ver todos:

```bash
sudo docker compose ps -a
```

---

# 12. Estado esperado

Cuando todo está funcionando:

```text
nas-ai-repo    Up
nas-ai-api     Up / healthy
nas-ai-web     Up / healthy
```

Comprobar API:

```bash
sudo docker inspect nas-ai-api \
  --format '{{.State.Health.Status}}'
```

Comprobar Web:

```bash
sudo docker inspect nas-ai-web \
  --format '{{.State.Health.Status}}'
```

---

# 13. Logs

API:

```bash
sudo docker compose logs api --tail=100
```

Seguir API en vivo:

```bash
sudo docker compose logs -f api
```

Web:

```bash
sudo docker compose logs web --tail=100
```

Repo:

```bash
sudo docker compose logs repo --tail=100
```

Todos:

```bash
sudo docker compose logs --tail=100
```

Salir de `logs -f`:

```text
Ctrl + C
```

Esto no detiene el container.

---

# 14. Reiniciar un servicio

API:

```bash
sudo docker compose restart api
```

Web:

```bash
sudo docker compose restart web
```

Repo:

```bash
sudo docker compose restart repo
```

Todos:

```bash
sudo docker compose restart
```

---

# 15. Cuándo usar `restart` y cuándo `--force-recreate`

## `restart`

Usar cuando solo necesitas reiniciar el proceso.

Ejemplo:

```bash
sudo docker compose restart api
```

## `--force-recreate`

Usar cuando cambió la configuración con la que el container fue creado.

Especialmente después de cambiar:

* Variables de entorno del backend.
* Puertos.
* Volúmenes.
* `compose.yaml`.
* Configuración del servicio.

Ejemplo:

```bash
sudo docker compose up -d --force-recreate api
```

Un simple `restart` no recrea el container y por tanto no es el procedimiento correcto para aplicar nuevos valores definidos mediante `env_file`.

---

# 16. Variables de entorno

El archivo de producción es:

```text
/volume1/docker/nas-app/repo/.env
```

Este archivo:

* No debe subirse a Git.
* Contiene secretos.
* Es específico de producción.

Ejemplo:

```env
NODE_ENV=production

DATABASE_URL="file:/app/data/database.sqlite"

PORT=3000
HOST=0.0.0.0

OPENROUTER_API_KEY="..."
GROQ_API_KEY="..."
CEREBRAS_API_KEY="..."
GEMINI_API_KEY="..."

JWT_SECRET="..."
JWT_REFRESH_SECRET="..."

SMTP_HOST="..."
SMTP_PORT="..."
SMTP_SECURE="..."
SMTP_USER="..."
SMTP_PASS="..."
SMTP_FROM="..."

FRONTEND_URL="http://192.168.20.122:8081"

COOKIE_DOMAIN=""

VITE_API_URL="http://192.168.20.122:3000"
```

---

# 17. Variables del backend

El API recibe `.env` mediante:

```yaml
env_file:
  - .env
```

Por tanto, las variables como:

```text
JWT_SECRET
JWT_REFRESH_SECRET
DATABASE_URL
OPENROUTER_API_KEY
GROQ_API_KEY
CEREBRAS_API_KEY
GEMINI_API_KEY
SMTP_*
FRONTEND_URL
```

son variables de runtime del API.

---

# 18. Cambiar una variable del backend

Ejemplo:

```env
JWT_SECRET="nuevo_valor"
```

Modificar:

```text
/volume1/docker/nas-app/repo/.env
```

Después recrear API:

```bash
sudo docker compose up -d --force-recreate api
```

No utilizar solamente:

```bash
sudo docker compose restart api
```

porque el container existente conserva el entorno con el que fue creado.

Comprobar que arrancó:

```bash
sudo docker compose ps api
```

Ver logs:

```bash
sudo docker compose logs api --tail=100
```

Nunca imprimir secretos directamente.

Para comprobar únicamente si existe una variable:

```bash
sudo docker compose run --rm --no-deps api \
  node -e 'console.log(process.env.JWT_SECRET ? "JWT_SECRET=SET" : "JWT_SECRET=MISSING")'
```

---

# 19. Variables `VITE_*`

Las variables de Vite funcionan de una forma diferente.

Por ejemplo:

```env
VITE_API_URL="http://192.168.20.122:3000"
```

es utilizada durante:

```bash
pnpm --filter @nas/web build
```

Vite incorpora ese valor al bundle generado.

Por tanto:

```text
.env
↓
VITE_API_URL
↓
vite build
↓
apps/web/dist
```

Cambiar el `.env` por sí solo no cambia el frontend ya generado.

---

# 20. Procedimiento CORRECTO para cambiar `VITE_API_URL`

Editar:

```text
/volume1/docker/nas-app/repo/.env
```

Después entrar a:

```text
Container Manager
→ nas-ai-repo
→ Terminal
```

Ejecutar:

```bash
cd /workspace
```

### Muy importante

El container `nas-ai-repo` fue creado anteriormente y puede tener en su entorno un valor antiguo.

Por eso, después de modificar `.env`, cargar explícitamente el archivo actualizado en la shell:

```bash
set -a
source .env
set +a
```

Comprobar:

```bash
echo "$VITE_API_URL"
```

Debe mostrar:

```text
http://192.168.20.122:3000
```

Después:

```bash
pnpm --filter @nas/web build
```

Esto actualiza:

```text
apps/web/dist
```

No es necesario reiniciar `nas-ai-web`.

El container Nginx monta:

```text
apps/web/dist
```

directamente:

```text
NAS
apps/web/dist
      ↓
nas-ai-web
/usr/share/nginx/html
```

Por tanto, una vez terminado:

```bash
pnpm --filter @nas/web build
```

el navegador puede simplemente recargar la página.

---

# 21. Regla importante para `VITE_*`

Después de cambiar:

```text
VITE_*
```

hacer siempre:

```bash
set -a
source .env
set +a

pnpm --filter @nas/web build
```

No es necesario:

```bash
docker compose restart web
```

porque `dist` está montado directamente.

Un restart de Nginx es opcional, pero no necesario.

---

# 22. Prisma

Desarrollo utiliza:

```text
apps/api/prisma/dev.db
```

Producción utiliza:

```text
/app/data/database.sqlite
```

que físicamente es:

```text
/volume1/docker/nas-app/data/api/database.sqlite
```

Nunca copiar la DB de desarrollo a producción.

---

# 23. Prisma — desarrollo

En el Mac:

```bash
pnpm --filter @nas/api db:migrate --name nombre_del_cambio
```

Esto ejecuta:

```text
prisma migrate dev
```

Después:

```bash
pnpm --filter @nas/api db:generate
```

Commit:

```bash
git add apps/api/prisma
git commit -m "feat(api): update database schema"
git push origin main
```

---

# 24. Prisma — producción

En producción utilizar:

```bash
pnpm --filter @nas/api db:migrate:deploy
```

Esto ejecuta:

```text
prisma migrate deploy
```

No utilizar en producción:

```bash
pnpm --filter @nas/api db:migrate
```

porque ese script ejecuta:

```text
prisma migrate dev
```

Tampoco utilizar:

```bash
pnpm --filter @nas/api db:migrate:reset
```

---

# 25. Cambio de schema de Prisma

Flujo completo:

### Mac

Modificar:

```text
apps/api/prisma/schema.prisma
```

Crear migración:

```bash
pnpm --filter @nas/api db:migrate --name nombre_del_cambio
```

Generar cliente:

```bash
pnpm --filter @nas/api db:generate
```

Commit:

```bash
git add apps/api/prisma
git commit -m "feat(api): update database schema"
git push
```

### NAS

En `nas-ai-repo`:

```bash
cd /workspace

git pull --ff-only origin main

set -a
source .env
set +a

pnpm install --frozen-lockfile
pnpm --filter @nas/api db:generate
pnpm --filter @nas/api db:migrate:deploy
```

Después recrear API:

```bash
sudo docker compose up -d --force-recreate api
```

---

# 26. Cambio solamente en API

Ejemplo:

```text
apps/api/src/routes/
apps/api/src/services/
apps/api/src/middleware/
```

### Mac

```bash
git add .
git commit -m "fix(api): description"
git push
```

### NAS

Container Manager:

```text
nas-ai-repo
→ Terminal
```

```bash
cd /workspace
git pull --ff-only origin main
```

Si cambió `package.json` o `pnpm-lock.yaml`:

```bash
pnpm install --frozen-lockfile
```

Si cambió Prisma:

```bash
set -a
source .env
set +a

pnpm --filter @nas/api db:generate
pnpm --filter @nas/api db:migrate:deploy
```

Después recrear API:

```bash
sudo docker compose up -d --force-recreate api
```

---

# 27. No hace falta `build` para el backend

Actualmente el API se ejecuta mediante:

```text
tsx src/index.ts
```

Por tanto no se necesita generar un `dist` del backend.

El código está montado desde:

```text
/workspace
```

y el proceso se reinicia para cargar el nuevo código.

---

# 28. Cambio solamente en Web

Ejemplo:

```text
apps/web/src/
apps/web/public/
apps/web/index.html
```

### Mac

```bash
git add .
git commit -m "feat(web): description"
git push
```

### NAS

En `nas-ai-repo`:

```bash
cd /workspace
git pull --ff-only origin main
```

Si cambiaron dependencias:

```bash
pnpm install --frozen-lockfile
```

Construir:

```bash
pnpm --filter @nas/web build
```

No es necesario reiniciar `nas-ai-web`.

Simplemente recargar:

```text
http://192.168.20.122:8081
```

---

# 29. Cambio en `packages/shared`

Si cambia:

```text
packages/shared/
```

considerar que tanto API como Web pueden verse afectados.

Después:

```bash
cd /workspace
git pull --ff-only origin main
```

Si cambió el lockfile:

```bash
pnpm install --frozen-lockfile
```

Construir Web:

```bash
pnpm --filter @nas/web build
```

Después reiniciar API:

```bash
sudo docker compose restart api
```

y recargar Web.

Si el cambio afecta Prisma, seguir además el procedimiento de migración.

---

# 30. Cambio en dependencias

Si se modificó:

```text
package.json
```

o:

```text
pnpm-lock.yaml
```

ejecutar en `nas-ai-repo`:

```bash
pnpm install --frozen-lockfile
```

Después ejecutar las acciones correspondientes al servicio afectado.

No usar automáticamente:

```bash
pnpm install
```

en producción.

---

# 31. Despliegue completo de API + Web

## En Mac

```bash
git add .
git commit -m "feat: update application"
git push origin main
```

## En NAS — `nas-ai-repo`

```bash
cd /workspace
git pull --ff-only origin main
```

Instalar si cambiaron dependencias:

```bash
pnpm install --frozen-lockfile
```

Si hay cambios de Prisma:

```bash
set -a
source .env
set +a

pnpm --filter @nas/api db:generate
pnpm --filter @nas/api db:migrate:deploy
```

Construir Web:

```bash
pnpm --filter @nas/web build
```

Después:

```bash
exit
```

Recrear API:

```bash
sudo docker compose up -d --force-recreate api
```

Web no necesita reinicio después de `vite build`.

---

# 32. Cambio normal de frontend

El procedimiento más corto es:

```bash
cd /workspace
git pull --ff-only origin main
pnpm --filter @nas/web build
```

Después:

```text
Recargar navegador
```

---

# 33. Cambio normal de backend

El procedimiento más corto es:

```bash
cd /workspace
git pull --ff-only origin main
```

Después:

```bash
exit
```

y:

```bash
sudo docker compose up -d --force-recreate api
```

---

# 34. Cambio de variable `VITE_*`

Procedimiento:

```bash
cd /workspace

set -a
source .env
set +a

echo "$VITE_API_URL"

pnpm --filter @nas/web build
```

Después:

```text
Recargar navegador
```

No hace falta reiniciar Web.

---

# 35. Cambio de variable backend

Procedimiento:

```text
Editar .env
```

Después:

```bash
sudo docker compose up -d --force-recreate api
```

No basta con:

```bash
sudo docker compose restart api
```

---

# 36. Comprobar API

Desde el NAS:

```bash
curl http://192.168.20.122:3000/health
```

Esperado:

```json
{"ok":true}
```

También puede probarse desde el navegador:

```text
http://192.168.20.122:3000/health
```

---

# 37. Comprobar Web

```bash
curl -I http://192.168.20.122:8081
```

Esperado:

```text
HTTP/1.1 200 OK
Server: nginx
```

Desde navegador:

```text
http://192.168.20.122:8081
```

---

# 38. Diagnóstico API en restart loop

Primero:

```bash
sudo docker compose ps api
```

Después:

```bash
sudo docker compose logs api --tail=200
```

Después:

```bash
sudo docker inspect nas-ai-api \
  --format 'Status={{.State.Status}} ExitCode={{.State.ExitCode}} OOMKilled={{.State.OOMKilled}} Error={{.State.Error}}'
```

Interpretación:

```text
ExitCode=1
```

normalmente indica que el proceso terminó por un error de aplicación/configuración.

```text
OOMKilled=true
```

indica terminación por memoria.

Comprobar variables sin revelar secretos:

```bash
sudo docker compose run --rm --no-deps api \
  node -e '
    for (const key of [
      "DATABASE_URL",
      "JWT_SECRET",
      "JWT_REFRESH_SECRET",
      "FRONTEND_URL"
    ]) {
      console.log(`${key}=${process.env[key] ? "SET" : "MISSING"}`)
    }
  '
```

---

# 39. Diagnóstico Web

Logs:

```bash
sudo docker compose logs web --tail=100
```

Probar configuración Nginx:

```bash
sudo docker exec -it nas-ai-web nginx -t
```

Ver archivos:

```bash
sudo docker exec -it nas-ai-web \
  ls -lah /usr/share/nginx/html
```

Debe existir:

```text
index.html
assets/
...
```

---

# 40. Diagnóstico Repo

Desde Container Manager:

```text
nas-ai-repo
→ Terminal
```

Comprobar:

```bash
cd /workspace
git status --short --branch
```

Git:

```bash
git --version
```

pnpm:

```bash
pnpm --version
```

Estado:

```bash
git status
```

---

# 41. Si Git vuelve a presentar problemas de ownership

El repo utiliza actualmente:

```text
UID 1028
GID 100
```

Desde SSH:

```bash
sudo chown -R 1028:100 /volume1/docker/nas-app/repo
```

No ejecutar cambios indiscriminados sobre ACL de Synology.

No modificar manualmente:

```text
/var/run/docker.sock
```

---

# 42. Base de datos

Base de producción:

```text
/volume1/docker/nas-app/data/api/database.sqlite
```

Dentro del container API:

```text
/app/data/database.sqlite
```

Montaje:

```text
/volume1/docker/nas-app/data/api
        ↓
/app/data
```

Esto permite recrear `nas-ai-api` sin eliminar la base de producción.

---

# 43. Backup de la base

La ruta:

```text
/volume1/docker/nas-app/data/api/
```

debe incluirse en el sistema de backup del Synology.

No depender exclusivamente de:

```text
git
```

para proteger la base.

El repositorio contiene:

```text
schema.prisma
migrations/
```

pero no debe contener la SQLite de producción.

---

# 44. Detener servicios

API:

```bash
sudo docker compose stop api
```

Web:

```bash
sudo docker compose stop web
```

Repo:

```bash
sudo docker compose stop repo
```

Todos:

```bash
sudo docker compose stop
```

---

# 45. Arrancar servicios detenidos

```bash
sudo docker compose start api
```

```bash
sudo docker compose start web
```

```bash
sudo docker compose start repo
```

Todos:

```bash
sudo docker compose start
```

---

# 46. Recrear servicios

API:

```bash
sudo docker compose up -d --force-recreate api
```

Web:

```bash
sudo docker compose up -d --force-recreate web
```

Repo:

```bash
sudo docker compose up -d --force-recreate repo
```

Todo:

```bash
sudo docker compose up -d --force-recreate
```

---

# 47. `docker compose down`

Puede utilizarse:

```bash
sudo docker compose down
```

Esto elimina los containers y la red del proyecto.

No utilizar habitualmente:

```bash
sudo docker compose down --volumes
```

y nunca eliminar manualmente:

```text
/volume1/docker/nas-app/data/api/
```

porque contiene la base de producción.

---

# 48. Puertos

API:

```text
0.0.0.0:3000 → container:3000
```

Web:

```text
0.0.0.0:8081 → container:80
```

Repo:

```text
sin puertos publicados
```

---

# 49. Nginx

Nginx utiliza:

```text
nginx:latest
```

y sirve:

```text
/apps/web/dist
```

como:

```text
/usr/share/nginx/html
```

Configuración:

```text
apps/web/nginx.conf
```

React Router utiliza:

```nginx
try_files $uri $uri/ /index.html;
```

para permitir rutas como:

```text
/login
/register
/chat
/settings
```

---

# 50. Vite

Producción:

```bash
pnpm --filter @nas/web build
```

Salida:

```text
apps/web/dist
```

No utilizar:

```bash
vite preview
```

como servidor de producción.

Nginx es el servidor que entrega la aplicación.

---

# 51. PM2

PM2 no participa en este entorno.

No ejecutar:

```bash
pm2 start ecosystem.config.cjs
```

El API se ejecuta directamente con:

```text
pnpm start:prod
```

y Docker mantiene el container.

---

# 52. Flujo de producción recomendado

```text
┌─────────────────────────┐
│          MAC            │
│                         │
│ modificar código        │
│       ↓                 │
│ pnpm build              │
│       ↓                 │
│ git commit              │
│       ↓                 │
│ git push                │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│       NAS AI REPO       │
│                         │
│ git pull                │
│       ↓                 │
│ pnpm install             │
│       ↓                 │
│ generate/migrate         │
│       ↓                 │
│ vite build               │
└────────────┬────────────┘
             │
       ┌─────┴──────┐
       ▼            ▼
    API            WEB
 recreate         dist
       │            │
       ▼            ▼
    Hono           Nginx
```

---

# 53. Checklist de despliegue

## Cambio de API

```text
[ ] git push desde Mac
[ ] git pull en nas-ai-repo
[ ] pnpm install si cambió dependencias
[ ] db:generate si cambió Prisma
[ ] db:migrate:deploy si hay migraciones
[ ] recrear API
[ ] comprobar /health
[ ] revisar logs
```

## Cambio de Web

```text
[ ] git push desde Mac
[ ] git pull en nas-ai-repo
[ ] pnpm install si cambió dependencias
[ ] pnpm --filter @nas/web build
[ ] recargar navegador
```

## Cambio de VITE_*

```text
[ ] modificar .env
[ ] source .env
[ ] comprobar echo "$VITE_API_URL"
[ ] pnpm --filter @nas/web build
[ ] recargar navegador
```

## Cambio de variable backend

```text
[ ] modificar .env
[ ] recrear nas-ai-api
[ ] comprobar logs
```

## Cambio de Prisma

```text
[ ] crear migration en Mac
[ ] git push
[ ] git pull en NAS
[ ] pnpm install si corresponde
[ ] pnpm db:generate
[ ] pnpm db:migrate:deploy
[ ] recrear API
```

---

# 54. Comandos esenciales

## Git

```bash
cd /workspace
git status
git pull --ff-only origin main
```

## Dependencias

```bash
pnpm install --frozen-lockfile
```

## Prisma

```bash
pnpm --filter @nas/api db:generate
pnpm --filter @nas/api db:migrate:deploy
```

## Web

```bash
pnpm --filter @nas/web build
```

## Estado

```bash
sudo docker compose ps
```

## Logs API

```bash
sudo docker compose logs api --tail=100
```

## Logs Web

```bash
sudo docker compose logs web --tail=100
```

## Reiniciar

```bash
sudo docker compose restart api
sudo docker compose restart web
```

## Recrear

```bash
sudo docker compose up -d --force-recreate api
sudo docker compose up -d --force-recreate web
```

## Health

```bash
curl http://192.168.20.122:3000/health
```

## Web

```bash
curl -I http://192.168.20.122:8081
```

---

# 55. Regla fundamental

El Mac es el origen del código:

```text
editar
→ probar
→ commit
→ push
```

El NAS es producción:

```text
pull
→ instalar dependencias si corresponde
→ migrar si corresponde
→ build web si corresponde
→ recrear/reiniciar servicio afectado
```

No editar código directamente en producción.

La excepción es:

```text
/volume1/docker/nas-app/repo/.env
```

porque contiene configuración específica del entorno de producción.

---

# 56. Estado de producción actual

```text
Frontend
http://192.168.20.122:8081

API
http://192.168.20.122:3000

Health
http://192.168.20.122:3000/health
```

Containers:

```text
nas-ai-repo
nas-ai-api
nas-ai-web
```

Imágenes:

```text
node:latest
nginx:latest
alpine/git:v2.54.0
```

Repositorio:

```text
/volume1/docker/nas-app/repo
```

Datos:

```text
/volume1/docker/nas-app/data/api
```

Git:

```text
https://github.com/BradMoyetones/nas-ai
```

Este documento describe el procedimiento operativo del entorno actual de NAS AI.
