import { Router } from 'express';
import { upload } from '../middleware/upload.middleware';
import * as controller from '../controllers/videoToImages.controller';

const router = Router();

router.post('/', upload.array('videos'), controller.extract);
router.get('/status/:jobId', controller.getStatus);

export default router;