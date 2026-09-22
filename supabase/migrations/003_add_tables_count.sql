-- Migration to add tables_count to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS tables_count INTEGER DEFAULT 0;
