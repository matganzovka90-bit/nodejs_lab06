import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

interface IUser {
  email: string;
  password?: string;
  createdAt: Date;
}
const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, {
  toJSON: {
    transform: (doc, ret) => {
      const { password, __v, ...userProps } = ret;
      return userProps;
    }
  },
  toObject: {
    transform: (doc, ret) => {
      const { password, __v, ...userProps } = ret;
      return userProps;
    }
  }
});

userSchema.pre('save', async function (this: Document & IUser) {
  if (!this.isModified('password')) return;

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password as string, salt);
  } catch (error: any) {
    throw error;
  }
});

export const User = model<IUser>('User', userSchema);