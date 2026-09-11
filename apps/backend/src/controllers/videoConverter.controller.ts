import { Request, Response } from 'express';
import * as service from '../services/videoConverter.service';

export async function convert(req: Request, res: Response) {
  try {
    const files = req.files as Express.Multer.File[];
    const settings = req.body.settings ? JSON.parse(req.body.settings) : {};
    const result = await service.convert(files, settings);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function getStatus(req: Request, res: Response) {
  try {
    const result = await service.getStatus(req.params.jobId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}