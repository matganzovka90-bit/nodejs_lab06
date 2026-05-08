import { connectTestDB, disconnectTestDB, clearTestDB } from './setup';
import { FilmModel } from '../models/film.model';

beforeAll(async () => await connectTestDB());
afterAll(async () => await disconnectTestDB());
afterEach(async () => await clearTestDB());

describe('FilmModel — unit tests', () => {

    const validFilm = {
        title: 'Inception',
        description: 'A mind-bending thriller',
        release_year: 2010,
        directors: ['Christopher Nolan'],
    };

    describe('Defaults', () => {
        it('should set description to empty string by default', async () => {
            const film = await FilmModel.create({
                title: 'No Desc',
                release_year: 2000,
                directors: ['Someone'],
            });
            expect(film.description).toBe('');
        });
    });

    describe('Timestamps', () => {
        it('should set createdAt and updatedAt automatically', async () => {
            const film = await FilmModel.create(validFilm);
            expect(film.createdAt).toBeInstanceOf(Date);
            expect(film.updatedAt).toBeInstanceOf(Date);
        });

        it('updatedAt should change after update', async () => {
            const film = await FilmModel.create(validFilm);
            await new Promise(r => setTimeout(r, 10));
            const updated = await FilmModel.findByIdAndUpdate(
                film._id,
                { title: 'Changed' },
                { new: true }
            );
            expect(updated!.updatedAt.getTime()).toBeGreaterThan(film.updatedAt.getTime());
        });
    });

    describe('Virtual: age', () => {
        it('should calculate age correctly', async () => {
            const film = await FilmModel.create(validFilm);
            const expected = new Date().getFullYear() - 2010;
            expect(film.age).toBe(expected);
        });
    });

    describe('Validation — title', () => {
        it('should fail if title is missing', async () => {
            await expect(
                FilmModel.create({ release_year: 2000, directors: ['A'] })
            ).rejects.toThrow();
        });

        it('should fail if title exceeds 100 characters', async () => {
            await expect(
                FilmModel.create({ title: 'A'.repeat(101), release_year: 2000, directors: ['A'] })
            ).rejects.toThrow();
        });

        it('should trim title whitespace', async () => {
            const film = await FilmModel.create({
                title: '  Trimmed  ',
                release_year: 2000,
                directors: ['A'],
            });
            expect(film.title).toBe('Trimmed');
        });
    });

    describe('Validation — release_year', () => {
        it('should fail if release_year is missing', async () => {
            await expect(
                FilmModel.create({ title: 'Test', directors: ['A'] })
            ).rejects.toThrow();
        });

        it('should fail if release_year is before 1894', async () => {
            await expect(
                FilmModel.create({ title: 'Old', release_year: 1893, directors: ['A'] })
            ).rejects.toThrow();
        });

        it('should fail if release_year is after 2030', async () => {
            await expect(
                FilmModel.create({ title: 'Future', release_year: 2031, directors: ['A'] })
            ).rejects.toThrow();
        });

        it('should accept boundary year 1894', async () => {
            const film = await FilmModel.create({ title: 'Old', release_year: 1894, directors: ['A'] });
            expect(film.release_year).toBe(1894);
        });
    });

    describe('Validation — directors', () => {
        it('should fail if directors is empty array', async () => {
            await expect(
                FilmModel.create({ title: 'Test', release_year: 2000, directors: [] })
            ).rejects.toThrow();
        });

        it('should fail if directors is missing', async () => {
            await expect(
                FilmModel.create({ title: 'Test', release_year: 2000 })
            ).rejects.toThrow();
        });

        it('should accept multiple directors', async () => {
            const film = await FilmModel.create({
                title: 'Test',
                release_year: 2000,
                directors: ['A', 'B', 'C'],
            });
            expect(film.directors).toHaveLength(3);
        });
    });
});