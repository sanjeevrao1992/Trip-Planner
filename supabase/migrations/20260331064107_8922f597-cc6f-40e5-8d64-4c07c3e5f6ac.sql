ALTER TABLE public.trips ADD COLUMN eat_contribution_limit integer NOT NULL DEFAULT 4;
ALTER TABLE public.trips ADD COLUMN visit_contribution_limit integer NOT NULL DEFAULT 4;