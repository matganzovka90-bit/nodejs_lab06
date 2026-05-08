import {Request, Response, NextFunction} from "express";
import { ZodSchema } from "zod";

export const validate = (shema: ZodSchema) => {
    return(req: Request, res: Response, next: NextFunction) => {
        try{
            req.body = shema.parse(req.body);

            next();
        } catch(error) {
            next(error);
        }
    }
}