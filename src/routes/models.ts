import { Router } from 'express';
import { modelCatalog } from '../services/ai/providers';

const router = Router();

router.get('/', (req, res) => {
    res.status(200).json({ categories: modelCatalog });
});

export { router as modelsRouter };
