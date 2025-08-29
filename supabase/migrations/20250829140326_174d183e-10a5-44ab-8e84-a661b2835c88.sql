-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  avatar_animal TEXT, -- Random animal avatar identifier
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create trips table
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_name TEXT NOT NULL,
  city_place_id TEXT NOT NULL, -- Google Places place_id for the city
  start_date DATE,
  end_date DATE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'base64url'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on trips
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Create policies for trips
CREATE POLICY "Trip owners can view their own trips" 
ON public.trips 
FOR SELECT 
USING (auth.uid() = owner_id);

CREATE POLICY "Trip owners can create trips" 
ON public.trips 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Trip owners can update their own trips" 
ON public.trips 
FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Trip owners can delete their own trips" 
ON public.trips 
FOR DELETE 
USING (auth.uid() = owner_id);

-- Allow anyone with share token to view trips (for friends)
CREATE POLICY "Anyone can view trips with share token via RPC" 
ON public.trips 
FOR SELECT 
USING (true); -- This will be restricted via RPC functions

-- Create categories enum
CREATE TYPE category_type AS ENUM ('eat', 'visit');

-- Create recommendations table (unique per Trip × Place × Category)
CREATE TABLE public.recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  category category_type NOT NULL,
  place_id TEXT NOT NULL, -- Google Places place_id
  place_name TEXT NOT NULL,
  place_address TEXT,
  endorsement_count INTEGER NOT NULL DEFAULT 0,
  traveller_order INTEGER, -- For drag & drop reordering by trip owner
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(trip_id, category, place_id)
);

-- Enable RLS on recommendations
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies for recommendations
CREATE POLICY "Anyone can view recommendations for accessible trips" 
ON public.recommendations 
FOR SELECT 
USING (true); -- Will be filtered via joins with trips

CREATE POLICY "Trip owners can update recommendation order" 
ON public.recommendations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.trips 
    WHERE trips.id = recommendations.trip_id 
    AND trips.owner_id = auth.uid()
  )
);

-- Create submissions table (friend contributions)
CREATE TABLE public.submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  recommendation_id UUID NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  category category_type NOT NULL,
  submitter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for anonymous
  submitter_name TEXT, -- For anonymous users
  submitter_session_id TEXT, -- For anonymous enforcement via localStorage
  why_text TEXT CHECK (length(why_text) <= 500),
  is_endorsement BOOLEAN NOT NULL DEFAULT false, -- true if +1, false if new place
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on submissions
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for submissions
CREATE POLICY "Anyone can view submissions" 
ON public.submissions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create submissions" 
ON public.submissions 
FOR INSERT 
WITH CHECK (
  -- Either authenticated user or anonymous with session
  (auth.uid() IS NOT NULL AND submitter_id = auth.uid()) OR 
  (auth.uid() IS NULL AND submitter_id IS NULL AND submitter_session_id IS NOT NULL)
);

CREATE POLICY "Users can update their own submissions" 
ON public.submissions 
FOR UPDATE 
USING (
  (auth.uid() IS NOT NULL AND submitter_id = auth.uid()) OR
  (auth.uid() IS NULL AND submitter_id IS NULL)
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at
  BEFORE UPDATE ON public.recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get trip by share token (for friends)
CREATE OR REPLACE FUNCTION public.get_trip_by_share_token(token TEXT)
RETURNS TABLE (
  id UUID,
  city_name TEXT,
  city_place_id TEXT,
  start_date DATE,
  end_date DATE,
  owner_name TEXT
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment endorsement count
CREATE OR REPLACE FUNCTION public.increment_endorsement_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the endorsement count on the recommendation
  UPDATE public.recommendations 
  SET endorsement_count = endorsement_count + 1,
      updated_at = now()
  WHERE id = NEW.recommendation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-increment endorsement count
CREATE TRIGGER increment_endorsement_on_submission
  AFTER INSERT ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_endorsement_count();

-- Create indexes for performance
CREATE INDEX idx_trips_owner_id ON public.trips(owner_id);
CREATE INDEX idx_trips_share_token ON public.trips(share_token);
CREATE INDEX idx_recommendations_trip_id ON public.recommendations(trip_id);
CREATE INDEX idx_recommendations_place_id ON public.recommendations(place_id);
CREATE INDEX idx_submissions_trip_id ON public.submissions(trip_id);
CREATE INDEX idx_submissions_submitter_id ON public.submissions(submitter_id);
CREATE INDEX idx_submissions_session_id ON public.submissions(submitter_session_id);