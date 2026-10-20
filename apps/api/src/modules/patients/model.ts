import { GENDERS, PATIENT_CONDITIONS } from '@doctor-tracker/shared';
import { model, Schema } from 'mongoose';
import { NAME_COLLATION } from '../../lib/list-query.js';
import { searchTokensPlugin } from '../../lib/search.js';

// Patients live in their own collection and reference a doctor: a doctor's patient
// list is unbounded, so embedding it would eventually hit the 16 MB document limit.
const patientSchema = new Schema(
  {
    // Null means unassigned. Stored explicitly so `{ doctorId: null }` hits the index.
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', default: null },
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 0, max: 120 },
    gender: { type: String, enum: GENDERS, required: true },
    phone: { type: String, required: true, trim: true },
    condition: { type: String, enum: PATIENT_CONDITIONS, required: true },
    admittedAt: { type: Date, required: true },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true },
);

patientSchema.plugin(searchTokensPlugin, { text: ['name'], phones: ['phone'] });

// Every list sort ends in `_id` (stable paging), so every list index does too.

// Doctor detail page, `/patients?doctorId=` (including unassigned), per-doctor patient
// counts on the doctors list (covered: only `doctorId` is read), and the delete-doctor guard.
patientSchema.index({ doctorId: 1, admittedAt: -1, _id: -1 });
// Condition filter with the admitted-date range and default sort.
patientSchema.index({ condition: 1, admittedAt: -1, _id: -1 });
// Default `/patients` list (newest admission first) and the admitted-date range.
patientSchema.index({ admittedAt: -1, _id: -1 });
// "Name A–Z" sort.
patientSchema.index({ name: 1, _id: 1 }, { collation: NAME_COLLATION });

export const PatientModel = model('Patient', patientSchema);
