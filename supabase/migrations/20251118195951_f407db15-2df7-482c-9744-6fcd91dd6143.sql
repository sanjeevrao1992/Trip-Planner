-- Add contribution limit columns to trips table
ALTER TABLE trips 
ADD COLUMN eat_contribution_limit integer DEFAULT 4,
ADD COLUMN visit_contribution_limit integer DEFAULT 4;

-- Add check constraints to ensure values are between 1 and 4
ALTER TABLE trips
ADD CONSTRAINT eat_contribution_limit_check CHECK (eat_contribution_limit >= 1 AND eat_contribution_limit <= 4),
ADD CONSTRAINT visit_contribution_limit_check CHECK (visit_contribution_limit >= 1 AND visit_contribution_limit <= 4);