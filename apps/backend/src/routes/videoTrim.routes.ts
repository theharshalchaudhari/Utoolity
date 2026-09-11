import { Router } from 'express';
import { upload } from '../middleware/upload.middleware';
import * as controller from '../controllers/videoTrim.controller';

const router = Router();

router.post('/', upload.array('videos'), controller.trim);
router.get('/status/:jobId', controller.getStatus);

export default router;