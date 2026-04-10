-- Update the handle_new_user function to NOT assign parent role for institution signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Check if this is an institution signup (has institution_name in metadata)
  -- If so, assign 'school' role instead of 'parent'
  IF NEW.raw_user_meta_data->>'institution_name' IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'school');
  ELSE
    -- Assign parent role by default for regular signups
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'parent');
  END IF;
  
  RETURN NEW;
END;
$$;