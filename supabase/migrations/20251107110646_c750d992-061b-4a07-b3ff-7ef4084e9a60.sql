-- Create storage bucket for MRI scans
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mri-scans',
  'mri-scans',
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
);

-- Create table for scan history and analysis results
CREATE TABLE public.scan_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  tumor_detected BOOLEAN NOT NULL,
  confidence INTEGER NOT NULL,
  tumor_level TEXT NOT NULL,
  tumor_type TEXT,
  recommendations TEXT[] NOT NULL,
  processing_time NUMERIC NOT NULL,
  all_predictions JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

-- Create policies for scan_history
CREATE POLICY "Users can view their own scans"
ON public.scan_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scans"
ON public.scan_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scans"
ON public.scan_history
FOR DELETE
USING (auth.uid() = user_id);

-- Create storage policies for mri-scans bucket
CREATE POLICY "Users can view their own MRI scans"
ON storage.objects
FOR SELECT
USING (bucket_id = 'mri-scans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own MRI scans"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'mri-scans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own MRI scans"
ON storage.objects
FOR DELETE
USING (bucket_id = 'mri-scans' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create index for faster queries
CREATE INDEX idx_scan_history_user_id ON public.scan_history(user_id);
CREATE INDEX idx_scan_history_created_at ON public.scan_history(created_at DESC);