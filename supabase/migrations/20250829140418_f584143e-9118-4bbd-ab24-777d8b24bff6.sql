-- Fix search path security issues for the functions created

-- Update the update_updated_at_column function with proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update the get_trip_by_share_token function with proper search_path
CREATE OR REPLACE FUNCTION public.get_trip_by_share_token(token TEXT)
RETURNS TABLE (
  id UUID,
  city_name TEXT,
  city_place_id TEXT,
  start_date DATE,
  end_date DATE,
  owner_name TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.city_name,
    t.city_place_id,
    t.start_date,
    t.end_date,
    p.name as owner_name
  FROM public.trips t
  LEFT JOIN public.profiles p ON p.user_id = t.owner_id
  WHERE t.share_token = token;
END;
$$;

-- Update the increment_endorsement_count function with proper search_path
CREATE OR REPLACE FUNCTION public.increment_endorsement_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the endorsement count on the recommendation
  UPDATE public.recommendations 
  SET endorsement_count = endorsement_count + 1,
      updated_at = now()
  WHERE id = NEW.recommendation_id;
  
  RETURN NEW;
END;
$$;