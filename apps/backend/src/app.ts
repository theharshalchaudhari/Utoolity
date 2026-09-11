import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import videoToImagesRoutes from './routes/videoToImages.routes';
import videoTrimRoutes from './routes/videoTrim.routes';
import videoConverterRoutes from './routes/videoConverter.routes';
import imageConverterRoutes from './routes/imageConverter.routes';
import imageClassificationRoutes from './routes/imageClassification.routes';
import polygonAnnotationRoutes from './routes/polygonAnnotation.routes';
import boundingBoxRoutes from './routes/boundingBox.routes';
import videoMergeRoutes from './routes/videoMerge.routes';
import { errorMiddleware } from './middleware/error.middleware';

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }),
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/tools/video-to-images', videoToImagesRoutes);
app.use('/api/tools/video-trim', videoTrimRoutes);
app.use('/api/tools/video-converter', videoConverterRoutes);
app.use('/api/tools/image-converter', imageConverterRoutes);
app.use('/api/tools/image-classification', imageClassificationRoutes);
app.use('/api/tools/polygon-annotation', polygonAnnotationRoutes);
app.use('/api/tools/bounding-box', boundingBoxRoutes);
app.use('/api/tools/video-merge', videoMergeRoutes);

app.use(errorMiddleware);

export default app;