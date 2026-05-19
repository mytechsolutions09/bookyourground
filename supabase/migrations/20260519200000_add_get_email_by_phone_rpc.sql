-- Create get_email_by_phone security definer function to resolve phone to email safely during login
CREATE OR REPLACE FUNCTION public.get_email_by_phone(p_phone text)
RETURNS text AS $$
DECLARE
  v_email text;
  v_clean_phone text;
BEGIN
  -- Clean input: remove +91 prefix or non-numeric formatting
  v_clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  if length(v_clean_phone) = 12 and left(v_clean_phone, 2) = '91' then
    v_clean_phone := substring(v_clean_phone from 3);
  elsif length(v_clean_phone) = 11 and left(v_clean_phone, 1) = '0' then
    v_clean_phone := substring(v_clean_phone from 2);
  end if;

  -- Look up email from auth.users by matching against profiles phone or auth.users phone
  SELECT au.email INTO v_email
  FROM public.profiles p
  JOIN auth.users au ON p.id = au.id
  WHERE regexp_replace(p.phone, '[^0-9]', '', 'g') LIKE '%' || v_clean_phone
     OR regexp_replace(au.phone, '[^0-9]', '', 'g') LIKE '%' || v_clean_phone;

  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
