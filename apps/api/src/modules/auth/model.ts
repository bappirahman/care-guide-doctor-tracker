import { model, Schema } from 'mongoose';

/**
 * One document per refresh token. Every token issued from the same login shares a
 * `sessionId`, so a whole rotation chain can be revoked at once when reuse is detected.
 */
const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: String, required: true },
    // `unique` builds { tokenHash: 1 }: every refresh, resume and logout looks a token up by hash.
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    // Set on rotation. Distinguishes "rotated moments ago" (a benign race) from reuse.
    replacedBy: { type: Schema.Types.ObjectId, default: null },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true },
);

// Revoking a whole session family on reuse or logout.
sessionSchema.index({ sessionId: 1 });
// MongoDB deletes expired tokens on its own; nothing has to sweep them.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SessionModel = model('Session', sessionSchema);
