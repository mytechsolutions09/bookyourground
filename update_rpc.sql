CREATE OR REPLACE FUNCTION public.login_with_otp_auth(p_phone text, p_new_password text)
RETURNS text AS $$
DECLARE
  v_email text;
  v_user_id uuid;
  v_clean_phone text;
BEGIN
  -- Clean input phone number
  v_clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  if length(v_clean_phone) = 12 and left(v_clean_phone, 2) = '91' then
    v_clean_phone := substring(v_clean_phone from 3);
  elsif length(v_clean_phone) = 11 and left(v_clean_phone, 1) = '0' then
    v_clean_phone := substring(v_clean_phone from 2);
  end if;

  -- Find the user ID and email
  SELECT p.id, au.email INTO v_user_id, v_email
  FROM public.profiles p
  JOIN auth.users au ON p.id = au.id
  WHERE regexp_replace(p.phone, '[^0-9]', '', 'g') LIKE '%' || v_clean_phone
     OR regexp_replace(au.phone, '[^0-9]', '', 'g') LIKE '%' || v_clean_phone
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Securely update the encrypted password in auth.users and auto-confirm email for phone login
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
  WHERE id = v_user_id;

  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
