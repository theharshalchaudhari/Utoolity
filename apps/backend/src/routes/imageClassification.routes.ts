import { Router } from 'express';
import { upload } from '../middleware/upload.middleware';
import * as controller from '../controllers/imageClassification.controller';

const router = Router();

router.post('/', upload.array('images'), controller.classify);
router.get('/status/:jobId', controller.getStatus);

export default router;