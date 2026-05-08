import { FilmModel } from '../models/film.model';
import { CreateFilm, UpdateFilm, Film } from '../schemas/entity.schema';
import { PaginatedResult, PaginationParams, SortParams } from '../types/pagination.types';
import { SortOrder } from 'mongoose';


export type FilmSortField = 'title' | 'release_year' | 'createdAt';

export interface FilmFilters {
    minYear?: number;
    director?: string;
}

const toFilm = (doc: any): Film => {
    const { _id, __v, ...rest } = doc;
    return { id: _id.toString(), ...rest,  age: new Date().getFullYear() - rest.release_year};
};

const buildQuery = (filters: FilmFilters): Record<string, unknown> => {
    const query: Record<string, unknown> = {};

    if (filters.minYear !== undefined) {
        query.release_year = { $gte: filters.minYear };
    }

    if (filters.director) {
        query.directors = {
            $elemMatch: { $regex: filters.director, $options: 'i' }
        };
    }

    return query;
};

export const filmRepository = {

    async create(data: CreateFilm): Promise<Film> {
        const film = await FilmModel.create(data);
        return toFilm(film.toObject());
    },

    async findById(id: string): Promise<Film | null> {
        const doc = await FilmModel.findById(id).lean();
        return doc ? toFilm(doc) : null;
    },

    async findAll(
        filters: FilmFilters = {},
        sort: SortParams<FilmSortField> = { field: 'createdAt', direction: 'desc' },
        pagination: PaginationParams = { page: 1, limit: 10 }
    ): Promise<PaginatedResult<Film>> {
        const query = buildQuery(filters);
        const skip = (pagination.page - 1) * pagination.limit;
        const sortQuery: Record<string, SortOrder> = { 
            [sort.field]: sort.direction === 'asc' ? 1 : -1 
        };

        const [docs, total] = await Promise.all([
            FilmModel.find(query).sort(sortQuery).skip(skip).limit(pagination.limit).lean(),
            FilmModel.countDocuments(query),
        ]);

        return {
            data: docs.map(toFilm),
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total,
                totalPages: Math.ceil(total / pagination.limit),
            },
        };
    },

    async findClassic(): Promise<Film[]> {
        const docs = await FilmModel.find({ release_year: { $lt: 2000 } }).lean();
        return docs.map(toFilm);
    },

    async update(id: string, data: UpdateFilm): Promise<Film | null> {
        const doc = await FilmModel.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true,
        }).lean();
        return doc ? toFilm(doc) : null;
    },

    async delete(id: string): Promise<boolean> {
        const result = await FilmModel.findByIdAndDelete(id);
        return result !== null;
    },
};