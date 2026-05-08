import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer;

export const connectTestDB = async (): Promise<void> => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
};

export const disconnectTestDB = async (): Promise<void> => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongod.stop();
};

export const clearTestDB = async (): Promise<void> => {
    const collections = mongoose.connection.collections;
    await Promise.all(
        Object.values(collections).map(collection => collection.deleteMany({}))
    );
};