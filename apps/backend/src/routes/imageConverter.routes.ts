import { Router } from 'express';
import { upload } from '../middleware/upload.middleware';
import * as controller from '../controllers/imageConverter.controller';

const router = Router();

router.post('/', upload.array('images'), controller.convert);
router.get('/status/:jobId', controller.getStatus);

export default router;