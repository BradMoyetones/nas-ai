import express from 'express';
import cors from 'cors';
import { modelsRouter } from './routes/models';
import { chatRouter } from './routes/chat';

const app = express();

app.use(cors());
app.use(express.json());

// Información del proyecto en la raíz
app.get('/', (req, res) => {
    res.status(200).json({
        name: 'nas-api',
        version: '1.0.0',
        description: 'API de streaming de Inteligencia Artificial para NAS',
        status: 'online',
    });
});

app.use('/api/models', modelsRouter);
app.use('/api/chat', chatRouter);

export { app };
