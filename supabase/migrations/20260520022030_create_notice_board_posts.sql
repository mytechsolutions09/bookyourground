-- 1. Create Notice Board Posts Table
CREATE TABLE notice_board_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_type TEXT NOT NULL CHECK (post_type IN ('players_needed', 'teams_needed')),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Use name for either the team's name or player's name based on the post_type
  name TEXT NOT NULL, 
  role TEXT NOT NULL,
  city TEXT NOT NULL,
  message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Set up Row Level Security (RLS)
ALTER TABLE notice_board_posts ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Allow anyone to read posts
CREATE POLICY "Notice board posts are viewable by everyone"
  ON notice_board_posts FOR SELECT
  USING (true);

-- Allow authenticated users to create posts
CREATE POLICY "Authenticated users can create posts"
  ON notice_board_posts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update their own posts
CREATE POLICY "Users can update their own posts"
  ON notice_board_posts FOR UPDATE
  USING (auth.uid() = creator_id);

-- Allow users to delete their own posts
CREATE POLICY "Users can delete their own posts"
  ON notice_board_posts FOR DELETE
  USING (auth.uid() = creator_id);

-- Optional: Create index for faster querying by type
CREATE INDEX notice_board_posts_type_idx ON notice_board_posts(post_type);
