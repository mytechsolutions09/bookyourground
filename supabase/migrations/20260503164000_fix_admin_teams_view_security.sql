-- Fix security property for admin_teams_overview view
-- Changing from SECURITY DEFINER to SECURITY INVOKER to ensure RLS is enforced correctly

DROP VIEW IF EXISTS public.admin_teams_overview;

CREATE VIEW public.admin_teams_overview 
WITH (security_invoker = true)
AS
SELECT 
    t.id,
    t.name as team_name,
    t.location,
    t.captain as team_captain,
    t.initials,
    t.bg_color,
    t.image_url,
    t.owner_id as admin_profile_id,
    p.full_name as admin_name,
    p.phone as admin_phone,
    t.created_at,
    t.updated_at
FROM 
    public.teams t
LEFT JOIN 
    public.profiles p ON t.owner_id = p.id;

-- Grant access to the view
GRANT SELECT ON public.admin_teams_overview TO authenticated;
GRANT SELECT ON public.admin_teams_overview TO service_role;

-- Add a comment for documentation
COMMENT ON VIEW public.admin_teams_overview IS 'A comprehensive view of cricket teams joined with their administrative owner/manager profile details. Now uses SECURITY INVOKER to respect RLS.';
