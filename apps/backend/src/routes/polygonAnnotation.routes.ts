import { Router } from 'express';
import { upload } from '../middleware/upload.middleware';
import * as controller from '../controllers/polygonAnnotation.controller';

const router = Router();

router.post('/', upload.array('images'), controller.save);
router.get('/status/:jobId', controller.getStatus);

export default router;