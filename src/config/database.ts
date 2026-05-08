import "dotenv/config";
import mongoose from 'mongoose';

export const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;

        if(!uri) {
            throw new Error ("MONGODB_URI не знайдено");
        }

        await mongoose.connect(uri);
        console.log("MongoDB підключена!");

        mongoose.connection.on('error', (err) => {
            console.error("Помилка БД", err);
        })

        mongoose.connection.on('disconnected', () => {
            console.warn("БД від'єднано");
        })
    } catch(error) {
        console.error("Помилка при підключені до БД: ", error);
        throw error;
    }    
}