import { SPECIALIZATIONS } from '@doctor-tracker/shared';
import { model, Schema } from 'mongoose';
import { NAME_COLLATION } from '../../lib/list-query.js';
import { searchTokensPlugin } from '../../lib/search.js';

const doctorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    specialization: { type: String, enum: SPECIALIZATIONS, required: true },
    hospital: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    // `unique` builds { email: 1 }, which also backs the duplicate check on create/update.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  },
  { timestamps: true },
);

doctorSchema.plugin(searchTokensPlugin, { text: ['name', 'email'], phones: ['phone'] });

// Default list order (newest first) and the created-date range filter.
doctorSchema.index({ createdAt: -1 });
// Specialization / hospital filters keep the default sort and range on the same index;
// the leading field also serves `distinct` for the filter dropdowns.
doctorSchema.index({ specialization: 1, createdAt: -1 });
doctorSchema.index({ hospital: 1, createdAt: -1 });
// "Name A–Z" sort.
doctorSchema.index({ name: 1 }, { collation: NAME_COLLATION });

export const DoctorModel = model('Doctor', doctorSchema);
