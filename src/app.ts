import express from "express";
import cors from "cors";
import filmRoutes from './routes/entity';
import { errorHandler } from './middleware/error';
import healthRouter from './routes/health';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);
app.use('/api/films', filmRoutes);

app.use(errorHandler);

export default app;