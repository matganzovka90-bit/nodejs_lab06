import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { filmRepository, FilmSortField, FilmFilters } from '../storage/entity';
import { SortParams } from '../types/pagination.types';
import { validate } from '../middleware/validate';
import { CreateFilmSchema, UpdateFilmSchema } from '../schemas/entity.schema';

const router = Router();


const isValidId = (id: string): boolean =>
    Types.ObjectId.isValid(id) && new Types.ObjectId(id).toString() === id;

const ALLOWED_SORT_FIELDS: FilmSortField[] = ['title', 'release_year', 'createdAt'];

const parseSort = (raw?: string): SortParams<FilmSortField> => {
    const defaults: SortParams<FilmSortField> = { field: 'createdAt', direction: 'desc' };
    if (!raw) return defaults;

    let field: string;
    let direction: 'asc' | 'desc';

    if (raw.startsWith('-')) {
        field = raw.slice(1);
        direction = 'desc';
    } else if (raw.includes(':')) {
        const [f, d] = raw.split(':');
        field = f;
        direction = d === 'desc' ? 'desc' : 'asc';
    } else {
        field = raw;
        direction = 'asc';
    }

    if (!ALLOWED_SORT_FIELDS.includes(field as FilmSortField)) return defaults;
    return { field: field as FilmSortField, direction };
};

const parseFilters = (query: Request['query']): FilmFilters => ({
    minYear: query.minYear ? Number(query.minYear) : undefined,
    director: typeof query.director === 'string' ? query.director : undefined,
});

const parsePagination = (query: Request['query']) => ({
    page: query.page ? Math.max(1, Number(query.page)) : 1,
    limit: query.limit ? Math.min(100, Math.max(1, Number(query.limit))) : 10,
});


router.get('/classic', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const films = await filmRepository.findClassic();
        res.json(films);
    } catch (err) {
        next(err);
    }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await filmRepository.findAll(
            parseFilters(req.query),
            parseSort(typeof req.query.sort === 'string' ? req.query.sort : undefined),
            parsePagination(req.query)
        );
        res.json(result);
    } catch (err) {
        next(err);
    }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        if (!isValidId(id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid ID format' });
        }
        const film = await filmRepository.findById(id);
        if (!film) {
            return res.status(404).json({ status: 'error', message: 'Film not found' });
        }
        res.json(film);
    } catch (err) {
        next(err);
    }
});

router.post('/', validate(CreateFilmSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const film = await filmRepository.create(req.body);
        res.status(201).json(film);
    } catch (err) {
        next(err);
    }
});

router.patch('/:id', validate(UpdateFilmSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        if (!isValidId(id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid ID format' });
        }
        const film = await filmRepository.update(id, req.body);
        if (!film) {
            return res.status(404).json({ status: 'error', message: 'Film not found' });
        }
        res.json(film);
    } catch (err) {
        next(err);
    }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        if (!isValidId(id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid ID format' });
        }
        const deleted = await filmRepository.delete(id);
        if (!deleted) {
            return res.status(404).json({ status: 'error', message: 'Film not found' });
        }
        res.status(204).send();
    } catch (err) {
        next(err);
    }
});

export default router;