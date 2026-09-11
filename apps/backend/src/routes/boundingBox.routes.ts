import { Router } from 'express';
import { upload } from '../middleware/upload.middleware';
import * as controller from '../controllers/boundingBox.controller';

const router = Router();

router.post('/', upload.array('files'), controller.save);
router.get('/status/:jobId', controller.getStatus);

export default router;