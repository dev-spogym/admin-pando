ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS result VARCHAR(20),
  ADD COLUMN IF NOT EXISTS next_action TEXT,
  ADD COLUMN IF NOT EXISTS linked_sale_id INT REFERENCES sales(id);

CREATE INDEX IF NOT EXISTS idx_consultations_linked_sale
  ON consultations(linked_sale_id);
