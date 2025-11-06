-- ====================================================
-- CORREÇÃO: Melhorar função get_user_client_id
-- ====================================================

CREATE OR REPLACE FUNCTION public.get_user_client_id(user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id UUID;
  v_email TEXT;
BEGIN
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- MÉTODO 1: Buscar em user_profiles
  SELECT client_id INTO v_client_id
  FROM public.user_profiles
  WHERE id = user_id
  LIMIT 1;
  
  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;
  
  -- MÉTODO 2: Buscar em raw_user_meta_data
  BEGIN
    SELECT (raw_user_meta_data->>'clientId')::UUID INTO v_client_id
    FROM auth.users
    WHERE id = user_id
    LIMIT 1;
    
    IF v_client_id IS NOT NULL THEN
      RETURN v_client_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- MÉTODO 3: Buscar por email
  BEGIN
    SELECT email INTO v_email
    FROM auth.users
    WHERE id = user_id;
    
    IF v_email IS NOT NULL THEN
      SELECT id INTO v_client_id
      FROM public.clients
      WHERE LOWER(email) = LOWER(v_email)
      LIMIT 1;
      
      IF v_client_id IS NOT NULL THEN
        RETURN v_client_id;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_client_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_client_id(UUID) TO anon;

