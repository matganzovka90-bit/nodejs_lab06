import mongoose, { Schema, Document } from 'mongoose';

export interface IFilm extends Document {
    title: string;
    description: string;
    release_year: number;
    directors: string[];
    ownerId: mongoose.Types.ObjectId | string; 
    createdAt: Date;
    updatedAt: Date;
    age?: number;
}

const FilmSchema = new Schema<IFilm>(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },

        description: {
            type: String,
            maxlength: 500,
            default: ""
        },

        release_year: {
            type: Number,
            required: true,
            min: 1894,
            max: 2030
        },

        directors: {
            type: [String],
            required: true,
            validate: {
                validator: (arr: string[]) => arr.length > 0,
                message: "Повинен бути хоча б один режисер"
            }
        },

        ownerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

FilmSchema.virtual('age').get(function () {
    return new Date().getFullYear() - this.release_year;
});

export const FilmModel = mongoose.model<IFilm>('Film', FilmSchema);