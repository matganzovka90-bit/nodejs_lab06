import express from "express";
import cookieParser from 'cookie-parser';
import cors from "cors";
import filmRoutes from './routes/entity';
import { errorHandler } from './middleware/error';
import healthRouter from './routes/health';
import authRouter from './routes/auth';

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use('/health', healthRouter);
app.use('/api/films', filmRoutes);
app.use('/auth', authRouter);

app.use(errorHandler);

export default app;