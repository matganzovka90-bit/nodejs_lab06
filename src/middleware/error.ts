import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {

    if (err instanceof ZodError) {
        return res.status(400).json({
            status: 'error',
            message: 'Validation error',
            details: err.issues.map(e => ({
                path: e.path.join('.'),
                message: e.message,
            }))
        });
    }

    if (err instanceof mongoose.Error.CastError && err.kind === 'ObjectId') {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid ID format',
        });
    }

    if (err instanceof mongoose.Error.ValidationError) {
        return res.status(400).json({
            status: 'error',
            message: 'Validation error',
            details: Object.values(err.errors).map(e => ({
                path: e.path,
                message: e.message,
            }))
        });
    }

    if (err.name === 'MongoServerError' && err.code === 11000) {
        const field = Object.keys(err.keyValue ?? {})[0] ?? 'field';
        return res.status(409).json({
            status: 'error',
            message: `Duplicate value for field: ${field}`,
        });
    }

    console.error(err);
    res.status(500).json({
        status: 'error',
        message: 'Internal Server Error'
    });
};