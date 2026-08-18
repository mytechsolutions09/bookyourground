-- Create blog comments table
CREATE TABLE IF NOT EXISTS blog_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blog_id UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    author_email TEXT,
    author_avatar TEXT,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES blog_comments(id) ON DELETE CASCADE,
    is_approved BOOLEAN DEFAULT true,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries by blog_id and parent_id
CREATE INDEX IF NOT EXISTS idx_blog_comments_blog_id ON blog_comments(blog_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_parent_id ON blog_comments(parent_id);

-- Enable RLS
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

-- Policies

-- Anyone can view approved comments
DROP POLICY IF EXISTS "Anyone can view approved blog comments" ON blog_comments;
CREATE POLICY "Anyone can view approved blog comments"
    ON blog_comments FOR SELECT
    USING (is_approved = true OR (auth.uid() IS NOT NULL AND auth.uid() = user_id));

-- Anyone (authenticated or guest) can insert blog comments
DROP POLICY IF EXISTS "Anyone can post blog comments" ON blog_comments;
CREATE POLICY "Anyone can post blog comments"
    ON blog_comments FOR INSERT
    WITH CHECK (true);

-- Comment authors can update their own comments
DROP POLICY IF EXISTS "Authors can update their own blog comments" ON blog_comments;
CREATE POLICY "Authors can update their own blog comments"
    ON blog_comments FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- Comment authors can delete their own comments
DROP POLICY IF EXISTS "Authors can delete their own blog comments" ON blog_comments;
CREATE POLICY "Authors can delete their own blog comments"
    ON blog_comments FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
