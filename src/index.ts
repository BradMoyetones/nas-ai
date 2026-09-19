import { app } from './app';
import { env } from './config/env';
import { prisma } from './db';

async function main() {
    try {
        // Verificar conexión a la BD
        await prisma.$connect();
        console.log('✅ Conectado a la base de datos (SQLite via Prisma)');

        const server = app.listen(env.PORT, () => {
            console.log(`🚀 Servidor NAS API corriendo en http://localhost:${env.PORT}`);
        });

        // Manejo de cierres limpios
        process.on('SIGINT', async () => {
            await prisma.$disconnect();
            server.close(() => {
                console.log('Servidor apagado correctamente.');
                process.exit(0);
            });
        });
    } catch (error) {
        console.error('❌ Error al arrancar el servidor:', error);
        process.exit(1);
    }
}

main();
