ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS public_contact text;

ALTER TABLE chromebook_bookings
  ADD COLUMN IF NOT EXISTS requester_contact text;

ALTER TABLE chromebook_bookings
  ADD COLUMN IF NOT EXISTS protocol text;

CREATE UNIQUE INDEX IF NOT EXISTS chromebook_bookings_protocol_idx
  ON chromebook_bookings (protocol)
  WHERE protocol IS NOT NULL;

CREATE TABLE IF NOT EXISTS chromebook_booking_locks (
  id text PRIMARY KEY,
  owner text NOT NULL,
  expires_at timestamp NOT NULL
);
