-- Create policy to allow users to insert recommendations for trips
CREATE POLICY "Users can create recommendations for any trip"
ON public.recommendations
FOR INSERT
WITH CHECK (true);