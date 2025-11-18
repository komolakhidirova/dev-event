import { Schema, model, Document, Model, Types } from 'mongoose';
import { Event } from './event.model';

export interface Booking {
  eventId: Types.ObjectId;
  email: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BookingDocument extends Booking, Document {}

export type BookingModel = Model<BookingDocument>;

// Simple email format validation for user bookings
const isValidEmail = (email: string): boolean => {
  const trimmed = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed);
};

const bookingSchema = new Schema<BookingDocument, BookingModel>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true, // Indexed for faster event-based lookups
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: true,
  },
);

// Pre-save hook: validate email and ensure the referenced Event exists
bookingSchema.pre<BookingDocument>('save', async function preSave(next) {
  try {
    if (!this.email?.trim()) {
      throw new Error('Email is required.');
    }

    if (!isValidEmail(this.email)) {
      throw new Error('Invalid email format.');
    }

    // Only check the event reference when it is new or has changed
    if (this.isNew || this.isModified('eventId')) {
      const eventExists = await Event.exists({ _id: this.eventId }).lean().exec();

      if (!eventExists) {
        throw new Error('Referenced event does not exist.');
      }
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// Index on eventId to speed up queries by event
bookingSchema.index({ eventId: 1 });

export const Booking = model<BookingDocument, BookingModel>('Booking', bookingSchema);
