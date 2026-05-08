import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? 'OK' : 'Error',
    db: isDbConnected ? 'connected' : 'disconnected'
  });
});

export default router;