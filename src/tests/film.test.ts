import request from 'supertest';
import app from '../app';
import { FilmModel } from '../models/film.model';
import { connectTestDB, disconnectTestDB, clearTestDB } from './setup';
import mongoose from 'mongoose';

beforeAll(async () => await connectTestDB());
afterAll(async () => await disconnectTestDB());
afterEach(async () => await clearTestDB());


const createFilm = (overrides = {}) =>
    request(app).post('/api/films').send({
        title: 'Inception',
        description: 'Sci-fi thriller',
        release_year: 2010,
        directors: ['Nolan'],
        ...overrides,
    });

const seedFilms = async () => {
    await FilmModel.create([
        { title: 'Pulp Fiction', description: 'Crime', release_year: 1994, directors: ['Tarantino'] },
        { title: 'Interstellar', description: 'Sci-fi', release_year: 2014, directors: ['Nolan'] },
        { title: 'Inception', description: 'Sci-fi', release_year: 2010, directors: ['Nolan'] },
    ]);
};


describe('POST /api/films', () => {

    it('1. should create film and return 201 with id', async () => {
        const res = await createFilm();
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.title).toBe('Inception');
    });

    it('2. should fail with 400 if title is empty', async () => {
        const res = await createFilm({ title: '' });
        expect(res.statusCode).toBe(400);
    });

    it('3. should fail with 400 if release_year is before 1894', async () => {
        const res = await createFilm({ release_year: 1890 });
        expect(res.statusCode).toBe(400);
    });

    it('4. should fail with 400 if release_year is after 2030', async () => {
        const res = await createFilm({ release_year: 2031 });
        expect(res.statusCode).toBe(400);
    });

    it('5. should fail with 400 if directors is not an array', async () => {
        const res = await createFilm({ directors: 'Nolan' });
        expect(res.statusCode).toBe(400);
    });

    it('6. should fail with 400 if directors is empty array', async () => {
        const res = await createFilm({ directors: [] });
        expect(res.statusCode).toBe(400);
    });

    it('7. should use empty string as default description', async () => {
        const res = await request(app).post('/api/films').send({
            title: 'No Desc',
            release_year: 2000,
            directors: ['A'],
        });
        expect(res.statusCode).toBe(201);
        expect(res.body.description).toBe('');
    });

    it('8. should include createdAt and updatedAt', async () => {
        const res = await createFilm();
        expect(res.body).toHaveProperty('createdAt');
        expect(res.body).toHaveProperty('updatedAt');
    });
});


describe('GET /api/films', () => {

    it('9. should return paginated object with data and pagination', async () => {
        const res = await request(app).get('/api/films');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('pagination');
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('10. pagination should have correct fields', async () => {
        await seedFilms();
        const res = await request(app).get('/api/films?page=1&limit=2');
        expect(res.body.pagination).toMatchObject({
            page: 1,
            limit: 2,
            total: 3,
            totalPages: 2,
        });
        expect(res.body.data).toHaveLength(3); // should be 2
    });

    it('11. should filter by minYear', async () => {
        await seedFilms();
        const res = await request(app).get('/api/films?minYear=2010');
        expect(res.body.data.every((f: any) => f.release_year >= 2010)).toBe(true);
        expect(res.body.data).toHaveLength(2);
    });

    it('12. should filter by director (case-insensitive)', async () => {
        await seedFilms();
        const res = await request(app).get('/api/films?director=nolan');
        expect(res.body.data).toHaveLength(2);
        expect(res.body.data.every((f: any) => f.directors.some((d: string) =>
            d.toLowerCase().includes('nolan')
        ))).toBe(true);
    });

    it('13. should combine minYear and director filters', async () => {
        await seedFilms();
        const res = await request(app).get('/api/films?minYear=2012&director=Nolan');
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].title).toBe('Interstellar');
    });

    it('14. should sort by title ascending', async () => {
        await seedFilms();
        const res = await request(app).get('/api/films?sort=title:asc');
        const titles = res.body.data.map((f: any) => f.title);
        expect(titles).toEqual([...titles].sort());
    });

    it('15. should sort by release_year descending using minus prefix', async () => {
        await seedFilms();
        const res = await request(app).get('/api/films?sort=-release_year');
        const years = res.body.data.map((f: any) => f.release_year);
        expect(years[0]).toBeGreaterThanOrEqual(years[1]);
    });

    it('16. page 2 should return remaining films', async () => {
        await seedFilms();
        const res = await request(app).get('/api/films?page=2&limit=2');
        expect(res.body.data).toHaveLength(1);
        expect(res.body.pagination.page).toBe(2);
    });
});


describe('GET /api/films/classic', () => {

    it('17. should return only films before 2000', async () => {
        await seedFilms();
        const res = await request(app).get('/api/films/classic');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].title).toBe('Pulp Fiction');
    });

    it('18. should return empty array if no classic films', async () => {
        await FilmModel.create({ title: 'New', release_year: 2020, directors: ['A'] });
        const res = await request(app).get('/api/films/classic');
        expect(res.body).toHaveLength(0);
    });
});


describe('GET /api/films/:id', () => {

    it('19. should return film by valid existing id', async () => {
        const created = await createFilm();
        const res = await request(app).get(`/api/films/${created.body.id}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.title).toBe('Inception');
    });

    it('20. should return 404 for valid but non-existent ObjectId', async () => {
        const res = await request(app).get('/api/films/000000000000000000000000');
        expect(res.statusCode).toBe(404);
    });

    it('21. should return 400 for invalid ID format', async () => {
        const res = await request(app).get('/api/films/abc');
        expect(res.statusCode).toBe(400);
    });
});


describe('PATCH /api/films/:id', () => {

    it('22. should update title and return updated film', async () => {
        const created = await createFilm();
        const res = await request(app)
            .patch(`/api/films/${created.body.id}`)
            .send({ title: 'Updated' });
        expect(res.statusCode).toBe(200);
        expect(res.body.title).toBe('Updated');
        expect(res.body.release_year).toBe(2010);
    });

    it('23. updatedAt should be greater than createdAt after update', async () => {
        const created = await createFilm();
        await new Promise(r => setTimeout(r, 20));
        const res = await request(app)
            .patch(`/api/films/${created.body.id}`)
            .send({ title: 'Changed' });
        expect(new Date(res.body.updatedAt).getTime())
            .toBeGreaterThan(new Date(res.body.createdAt).getTime());
    });

    it('24. should return 400 for invalid release_year', async () => {
        const created = await createFilm();
        const res = await request(app)
            .patch(`/api/films/${created.body.id}`)
            .send({ release_year: 3000 });
        expect(res.statusCode).toBe(400);
    });

    it('25. should return 404 for non-existent ObjectId', async () => {
        const res = await request(app)
            .patch('/api/films/000000000000000000000000')
            .send({ title: 'Ghost' });
        expect(res.statusCode).toBe(404);
    });

    it('26. should return 400 for invalid ID format', async () => {
        const res = await request(app)
            .patch('/api/films/bad-id')
            .send({ title: 'Ghost' });
        expect(res.statusCode).toBe(400);
    });
});


describe('DELETE /api/films/:id', () => {

    it('27. should delete film and return 204', async () => {
        const created = await createFilm();
        const res = await request(app).delete(`/api/films/${created.body.id}`);
        expect(res.statusCode).toBe(204);
    });

    it('28. should return 404 on second delete of same film', async () => {
        const created = await createFilm();
        await request(app).delete(`/api/films/${created.body.id}`);
        const res = await request(app).delete(`/api/films/${created.body.id}`);
        expect(res.statusCode).toBe(404);
    });

    it('29. should return 404 for non-existent ObjectId', async () => {
        const res = await request(app).delete('/api/films/000000000000000000000000');
        expect(res.statusCode).toBe(404);
    });

    it('30. should return 400 for invalid ID format', async () => {
        const res = await request(app).delete('/api/films/bad-id');
        expect(res.statusCode).toBe(400);
    });
});

describe('ErrorHandler middleware', () => {

    it('31. should return 400 for CastError (invalid ObjectId format)', async () => {
        const res = await request(app).get('/api/films/abc');
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('Invalid ID format');
    });

    it('32. should return 400 for Mongoose ValidationError', async () => {
        const res = await createFilm({ release_year: 1800 });
        expect(res.statusCode).toBe(400);
        expect(res.body.status).toBe('error');
    });

    it('33. should return 500 for unknown errors', async () => {
        jest.spyOn(FilmModel, 'find').mockImplementationOnce(() => {
            throw new Error('Unknown error');
        });
        const res = await request(app).get('/api/films');
        expect(res.statusCode).toBe(500);
        expect(res.body.message).toBe('Internal Server Error');
        jest.restoreAllMocks();
    });
});

describe('ErrorHandler — specific error types', () => {

    it('34. should return 400 for Mongoose CastError', async () => {
        jest.spyOn(FilmModel, 'findById').mockImplementationOnce(() => {
            throw new mongoose.Error.CastError('ObjectId', 'bad', 'id');
        });
        const validObjectId = '000000000000000000000000';
        const res = await request(app).get(`/api/films/${validObjectId}`);
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('Invalid ID format');
        jest.restoreAllMocks();
    });

    it('35. should return 400 for Mongoose ValidationError', async () => {
        jest.spyOn(FilmModel, 'create' as any).mockImplementationOnce(() => {
            const err = new mongoose.Error.ValidationError();
            err.errors['title'] = new mongoose.Error.ValidatorError({
                message: 'Title is required',
                path: 'title',
                value: '',
            });
            throw err;
        });
        const res = await createFilm({ title: '' });
        expect(res.statusCode).toBe(400);
        expect(res.body.status).toBe('error');
        expect(res.body.details[0].path).toBe('title');
        jest.restoreAllMocks();
    });

    it('36. should return 409 for MongoServerError duplicate key', async () => {
        jest.spyOn(FilmModel, 'create' as any).mockImplementationOnce(() => {
            const err: any = new Error('Duplicate key');
            err.name = 'MongoServerError';
            err.code = 11000;
            err.keyValue = { title: 'Inception' };
            throw err;
        });
        const res = await createFilm();
        expect(res.statusCode).toBe(409);
        expect(res.body.message).toBe('Duplicate value for field: title');
        jest.restoreAllMocks();
    });
});