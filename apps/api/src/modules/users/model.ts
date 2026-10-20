import { USER_ROLES } from '@doctor-tracker/shared';
import { model, Schema } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    // `unique` builds { email: 1 }: password login and Google account linking look users up by email.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Optional because Google-only admins never set a password.
    passwordHash: { type: String, select: false },
    googleId: { type: String },
    role: { type: String, enum: USER_ROLES, required: true, default: 'admin' },
  },
  { timestamps: true },
);

// Google callback lookup. Partial so the many users without a googleId don't collide on null.
userSchema.index(
  { googleId: 1 },
  { unique: true, partialFilterExpression: { googleId: { $type: 'string' } } },
);

export const UserModel = model('User', userSchema);
