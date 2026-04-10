-- Update handle_new_user to skip role assignment for institution signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Check if this is an institution signup (has institution_name in metadata)
  -- Skip role assignment - they need to complete school registration first
  -- The school role will be assigned after school is created in SchoolRegister
  IF NEW.raw_user_meta_data->>'institution_name' IS NOT NULL THEN
    NULL; -- No role assignment for institution signups
  ELSE
    -- Assign parent role by default for regular signups
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'parent');
  END IF;
  
  RETURN NEW;
END;
$function$;