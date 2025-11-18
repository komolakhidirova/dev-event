import { Schema, model, Document, Model } from 'mongoose';

// Core Event properties stored in the database
export interface Event {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string; // Normalized ISO date string (YYYY-MM-DD)
  time: string; // Normalized 24h time string (HH:MM)
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EventDocument extends Event, Document {}

export type EventModel = Model<EventDocument>;

// Slug generator: lowercased, URL-friendly, and trimmed
const slugifyTitle = (title: string): string =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

// Ensure time is stored in a consistent 24h HH:MM format
const normalizeTime = (time: string): string => {
  const trimmed = time.trim();
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(trimmed);

  if (!match) {
    throw new Error('Invalid time format. Expected HH:MM (24-hour).');
  }

  const hours = match[1];
  const minutes = match[2];

  return `${hours}:${minutes}`;
};

// Normalizes date to an ISO calendar date (YYYY-MM-DD)
const normalizeDate = (dateStr: string): string => {
  const parsed = new Date(dateStr);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid date format.');
  }

  // Use UTC date portion for consistency
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const eventSchema = new Schema<EventDocument, EventModel>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    description: { type: String, required: true, trim: true },
    overview: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    mode: { type: String, required: true, trim: true },
    audience: { type: String, required: true, trim: true },
    agenda: { type: [String], required: true },
    organizer: { type: String, required: true, trim: true },
    tags: { type: [String], required: true },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: true,
  },
);

// Pre-save hook: validate required content, normalize date/time, and manage slug
eventSchema.pre<EventDocument>('save', function preSave(next) {
  try {
    // Validate non-empty required strings
    if (!this.title?.trim()) throw new Error('Title is required.');
    if (!this.description?.trim()) throw new Error('Description is required.');
    if (!this.overview?.trim()) throw new Error('Overview is required.');
    if (!this.image?.trim()) throw new Error('Image is required.');
    if (!this.venue?.trim()) throw new Error('Venue is required.');
    if (!this.location?.trim()) throw new Error('Location is required.');
    if (!this.mode?.trim()) throw new Error('Mode is required.');
    if (!this.audience?.trim()) throw new Error('Audience is required.');
    if (!this.organizer?.trim()) throw new Error('Organizer is required.');

    // Validate required arrays and ensure items are non-empty strings
    if (!Array.isArray(this.agenda) || this.agenda.length === 0) {
      throw new Error('Agenda is required and cannot be empty.');
    }

    if (!Array.isArray(this.tags) || this.tags.length === 0) {
      throw new Error('Tags are required and cannot be empty.');
    }

    this.agenda = this.agenda.map((item) => {
      const trimmed = item.trim();
      if (!trimmed) throw new Error('Agenda items cannot be empty.');
      return trimmed;
    });

    this.tags = this.tags.map((tag) => {
      const trimmed = tag.trim();
      if (!trimmed) throw new Error('Tags cannot contain empty values.');
      return trimmed.toLowerCase();
    });

    // Normalize date and time to consistent formats
    this.date = normalizeDate(this.date);
    this.time = normalizeTime(this.time);

    // Generate or regenerate slug only when the title changes
    if (this.isNew || this.isModified('title')) {
      this.slug = slugifyTitle(this.title);
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// Unique index on slug to enforce URL uniqueness
eventSchema.index({ slug: 1 }, { unique: true });

export const Event = model<EventDocument, EventModel>('Event', eventSchema);
