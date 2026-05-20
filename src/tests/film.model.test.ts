import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import cookieParser from 'cookie-parser';
import filmRouter from '../routes/entity'; 
import authRouter from '../routes/auth'; 

let mongoServer: MongoMemoryServer;
let app: ReturnType<typeof express>;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = express();
  app.use(express.json());
  app.use(cookieParser()); 
  
  app.use('/auth', authRouter);
  app.use('/films', filmRouter);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Захист CRUD фільмів та перевірка власника', () => {
  let userACookies: string[];
  let userBCookies: string[];
  let sharedFilmId: string;

  beforeAll(async () => {
    await request(app).post('/auth/register').send({ email: 'userA@test.com', password: 'password123' });
    const loginA = await request(app).post('/auth/login').send({ email: 'userA@test.com', password: 'password123' });
    userACookies = loginA.get('Set-Cookie') || [];

    await request(app).post('/auth/register').send({ email: 'userB@test.com', password: 'password123' });
    const loginB = await request(app).post('/auth/login').send({ email: 'userB@test.com', password: 'password123' });
    userBCookies = loginB.get('Set-Cookie') || [];
  });

  afterAll(async () => {
    const collections = mongoose.connection.collections;
    if (collections.films) {
      await collections.films.deleteMany({});
    }
  });

  describe('POST /films', () => {
    it('має повернути 401 Unauthorized, якщо токен відсутній', async () => {
      const res = await request(app)
        .post('/films')
        .send({
          title: 'Inception',
          description: 'A thief who steals corporate secrets',
          release_year: 2010,
          directors: ['Christopher Nolan']
        });

      expect(res.status).toBe(401);
    });

    it('має успішно створити фільм і привʼязати ownerId, якщо користувач авторизований', async () => {
      const res = await request(app)
        .post('/films')
        .set('Cookie', userACookies)
        .send({
          title: 'Inception',
          description: 'A thief who steals corporate secrets',
          release_year: 2010,
          directors: ['Christopher Nolan']
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id'); 
      expect(res.body).toHaveProperty('ownerId'); 
      
      sharedFilmId = res.body.id || res.body._id; 
    });
  });

  describe('PATCH /films/:id', () => {
    it('має повернути 403 Forbidden, якщо Користувач Б намагається змінити фільм Користувача А', async () => {
      const res = await request(app)
        .patch(`/films/${sharedFilmId}`)
        .set('Cookie', userBCookies) 
        .send({ title: 'Зламана назва' });

      expect(res.status).toBe(403);
    });

    it('має успішно оновити фільм, якщо запит робить його справжній власник (Користувач А)', async () => {
      const res = await request(app)
        .patch(`/films/${sharedFilmId}`)
        .set('Cookie', userACookies) 
        .send({ title: 'Inception - Updated Edition' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Inception - Updated Edition');
    });
  });

  describe('DELETE /films/:id', () => {
    it('має повернути 403 Forbidden, якщо чужий користувач (Користувач Б) намагається видалити фільм', async () => {
      const res = await request(app)
        .delete(`/films/${sharedFilmId}`)
        .set('Cookie', userBCookies); 

      expect(res.status).toBe(403);
    });

    it('має успішно видалити фільм (204), якщо дію виконує власник (Користувач А)', async () => {
      const res = await request(app)
        .delete(`/films/${sharedFilmId}`)
        .set('Cookie', userACookies); 

      expect(res.status).toBe(204);
    });
  });
});