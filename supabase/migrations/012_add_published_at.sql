-- Migration to add published_at column to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;
