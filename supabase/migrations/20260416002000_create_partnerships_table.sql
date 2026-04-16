-- migrations/20260416002000_create_partnerships_table.sql
CREATE TABLE IF NOT EXISTS public.partnerships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  innings_id UUID REFERENCES public.innings(id) ON DELETE CASCADE,
  wicket_number INT NOT NULL,
  batter_1_name TEXT NOT NULL,
  batter_2_name TEXT NOT NULL,
  batter_1_runs INT DEFAULT 0,
  batter_1_balls INT DEFAULT 0,
  batter_2_runs INT DEFAULT 0,
  batter_2_balls INT DEFAULT 0,
  extras INT DEFAULT 0,
  total_runs INT DEFAULT 0,
  total_balls INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  not_out_batter_name TEXT,
  out_batter_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Realtime for partnerships
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'partnerships'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE partnerships;
    END IF;
END $$;

-- RLS Policies
ALTER TABLE public.partnerships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partnerships_permissive_select" ON public.partnerships FOR SELECT USING (true);
CREATE POLICY "partnerships_permissive_insert" ON public.partnerships FOR INSERT WITH CHECK (true);
CREATE POLICY "partnerships_permissive_update" ON public.partnerships FOR UPDATE USING (true);
CREATE POLICY "partnerships_permissive_delete" ON public.partnerships FOR DELETE USING (true);
