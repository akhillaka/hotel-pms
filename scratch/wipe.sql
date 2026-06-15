PRAGMA foreign_keys = OFF;
DROP TRIGGER IF EXISTS prevent_delete_reservations;
DROP TRIGGER IF EXISTS prevent_delete_guests;

DELETE FROM reservations;
DELETE FROM guests;

CREATE TRIGGER IF NOT EXISTS prevent_delete_reservations BEFORE DELETE ON reservations BEGIN SELECT RAISE(ABORT, 'Compliance Alert: Deletion is strictly prohibited on table reservations due to hotel PMS audit policy.'); END;
CREATE TRIGGER IF NOT EXISTS prevent_delete_guests BEFORE DELETE ON guests BEGIN SELECT RAISE(ABORT, 'Compliance Alert: Deletion is strictly prohibited on table guests due to hotel PMS audit policy.'); END;
PRAGMA foreign_keys = ON;
