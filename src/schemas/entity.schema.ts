import {z} from 'zod';

export const CreateFilmSchema = z.object({
    title: z.string().min(1, "Поле не може бути пустим").max(100, "Перевищено ліміт"),
    description: z.string().max(500, "Занадто довгий опис").optional().default(""),
    release_year: z.number().int().min(1894, "Кіно тоді ще не винайшли").max(2030, "Ще б дожити"),
    directors: z.array(
        z.string().min(1).max(50)
    ).min(1, "Повинен бути вказаний хочаб один режисер")
});

export const UpdateFilmSchema = CreateFilmSchema.partial();

export const FilmSchema = CreateFilmSchema.extend({
    id: z.string(),
    createdAt: z.date(),
    updatedAt: z.date()
});

export type CreateFilm = z.infer<typeof CreateFilmSchema>;
export type UpdateFilm = z.infer<typeof UpdateFilmSchema>;
export type Film = z.infer<typeof FilmSchema>;