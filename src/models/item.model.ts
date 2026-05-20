import { Schema, model, Document } from 'mongoose';

export interface IItem extends Document {
  title: string;
  description: string;
  ownerId: Schema.Types.ObjectId; 
}

const itemSchema = new Schema<IItem>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  ownerId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',              
    required: true 
  }
});

export const Item = model<IItem>('Item', itemSchema);