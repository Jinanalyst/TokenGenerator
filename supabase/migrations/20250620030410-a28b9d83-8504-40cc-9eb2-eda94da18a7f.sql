
-- Enable Row Level Security on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own record
CREATE POLICY "Users can view their own record"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Create policy to allow users to update their own record
CREATE POLICY "Users can update their own record"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Create policy to allow inserting new users (for registration)
CREATE POLICY "Users can insert their own record"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);
