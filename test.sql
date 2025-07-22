-- Insert a test employee
INSERT INTO Employee (
  id, firstName, lastName, sex, createdAt, updatedAt
) VALUES (
  1, 'Test', 'User', 'male', NOW(), NOW()
);

-- Insert a test session definition
INSERT INTO SessionDefinition (
  id, sessionNumber, expectedClockIn, expectedClockOut
) VALUES (
  1, 1, '2025-07-20 08:00:00', '2025-07-20 12:00:00'
);
