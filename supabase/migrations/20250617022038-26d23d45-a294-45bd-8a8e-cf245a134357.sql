
-- Fix function search_path security issues by setting SECURITY DEFINER and search_path
-- This prevents potential security vulnerabilities from search_path manipulation

-- Update the update_tokens_updated_at function
CREATE OR REPLACE FUNCTION public.update_tokens_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, name, username, joined_date)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1) || '-' || SUBSTRING(NEW.id::text, 1, 4)),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Update the update_post_comment_count function
CREATE OR REPLACE FUNCTION public.update_post_comment_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL; 
END;
$function$;
