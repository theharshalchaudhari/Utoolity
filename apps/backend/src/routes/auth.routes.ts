import { Router } from 'express';

const router = Router();

router.post('/login', (_req, res) => {
  res.json({ message: 'login' });
});

router.post('/logout', (_req, res) => {
  res.json({ message: 'logout' });
});

router.get('/me', (_req, res) => {
  res.json({ message: 'me' });
});

export default router;