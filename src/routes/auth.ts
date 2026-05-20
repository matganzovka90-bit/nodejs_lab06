import express, { Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/user.model';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_key';

const cookieOptions = {
  httpOnly: true,                        
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,          
};

const setTokenCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie('access_token', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, 
  });

  res.cookie('refresh_token', refreshToken, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000, 
  });
};

const registerSchema = z.object({
  email: z.string().email({ message: "Некоректний формат пошти" }),
  password: z.string().min(6, { message: "Пароль має бути не менше 6 символів" }),
});

const loginSchema = z.object({
  email: z.string().email({ message: "Некоректний формат пошти" }),
  password: z.string().min(1, { message: "Пароль обов'язковий" }),
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    const newUser = new User(validatedData);
    await newUser.save();

    const userObj = newUser.toObject();
    const { password, __v, ...userResponse } = userObj;

    return res.status(201).json(userResponse);

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues.map(e => e.message) });
    }
    if (error && error.code === 11000) {
      return res.status(409).json({ message: "Користувач з такою електронною поштою вже існує" });
    }
    return res.status(500).json({ message: "Внутрішня помилка сервера" });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Невірний email або пароль' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Невірний email або пароль' });
    }

    const accessToken = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user._id }, JWT_REFRESH_SECRET, { expiresIn: '30d' });

    setTokenCookies(res, accessToken, refreshToken);

    return res.status(200).json({ message: 'Успішний вхід' });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues.map(e => e.message) });
    }
    return res.status(500).json({ message: "Внутрішня помилка сервера" });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  const token = req.cookies.refresh_token;

  if (!token) {
    return res.status(401).json({ message: 'Токен відсутній' });
  }

  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string };

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Користувача не знайдено' });
    }

    const newAccessToken = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign({ userId: user._id }, JWT_REFRESH_SECRET, { expiresIn: '30d' });

    setTokenCookies(res, newAccessToken, newRefreshToken);

    return res.status(200).json({ message: 'Токени оновлено' });
  } catch (error) {
    return res.status(401).json({ message: 'Недійсний або прострочений токен' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('access_token', cookieOptions);
  res.clearCookie('refresh_token', cookieOptions);

  return res.status(200).json({ message: 'Успішний вихід із системи' });
});

export default router;