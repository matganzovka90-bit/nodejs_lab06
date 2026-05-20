import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express'; 
import authRouter from '../routes/auth';
import cookieParser from 'cookie-parser';

let mongoServer: MongoMemoryServer;
let app: ReturnType<typeof express>; 

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/auth', authRouter);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    if (collections[key]) {
      await collections[key].deleteMany({});
    }
  }
});

describe('Модуль автентифікації JWT', () => {
  const testUser = {
    email: 'login-test@knu.ua',
    password: 'password123',
  };

  beforeEach(async () => {
    await request(app).post('/auth/register').send(testUser); 
  });

  describe('POST /auth/login', () => {
    it('має успішно залогінити та повернути токени в куках', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send(testUser);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Успішний вхід');
      
      const cookies = res.get('Set-Cookie') || [];
      expect(cookies.some(c => c.includes('access_token'))).toBe(true);
      expect(cookies.some(c => c.includes('refresh_token'))).toBe(true);
    });

    it('має повернути 401 при неправильному паролі', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: testUser.email, password: 'wrong-password' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Невірний email або пароль');
    });
  });

  describe('POST /auth/refresh', () => {
    it('має оновити токени за валідним refresh-token', async () => {
      const loginRes = await request(app).post('/auth/login').send(testUser);
      const cookies = loginRes.get('Set-Cookie');

      const res = await request(app)
        .post('/auth/refresh')
        .set('Cookie', cookies || []);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Токени оновлено');
      
      const newCookies = res.get('Set-Cookie') || [];
      expect(newCookies.some(c => c.includes('access_token'))).toBe(true);
    });

    it('має повернути 401, якщо кука з токеном відсутня', async () => {
      const res = await request(app).post('/auth/refresh');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('має очистити авторизаційні куки', async () => {
      const res = await request(app).post('/auth/logout');
      expect(res.status).toBe(200);
      
      const cookies = res.get('Set-Cookie') || [];
      expect(cookies.some(c => c.includes('access_token=;'))).toBe(true);
    });
  });
});

describe('POST /auth/register', () => {
  it('має успішно зареєструвати користувача і не повертати пароль', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'securepassword123',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.email).toBe('test@example.com');
    expect(res.body).not.toHaveProperty('password');
  });

  it('має повернути 400, якщо email або пароль некоректні (Zod)', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        email: 'invalid-email',
        password: '123',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('має повернути 409 Conflict при спробі дублювання email', async () => {
    const userData = {
      email: 'duplicate@example.com',
      password: 'password125',
    };

    await request(app).post('/auth/register').send(userData);
    const res = await request(app).post('/auth/register').send(userData);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Користувач з такою електронною поштою вже існує');
  });
});