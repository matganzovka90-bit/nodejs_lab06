import "dotenv/config";
import app from './app';
import mongoose from 'mongoose';
import { connectDB } from './config/database';

const PORT: number = Number(process.env.PORT) || 3000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on http://0.0.0.0:${PORT}`);
      console.log(`Press CTRL+C to stop`);
    });
  } catch (error) {
    console.error('Помилка запуску сервера:', error);
    process.exit(1);
  }
};

startServer();

const shutdown = async () => {
  console.log('Завершення роботи...');
  try {
    await mongoose.connection.close();
    console.log('MongoDB з’єднання закрито');
    process.exit(0);
  } catch (err) {
    console.error('Помилка при закритті з’єднання:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);