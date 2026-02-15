-- Script to link existing donors to their user accounts
-- Run this if you have donors created before the userId feature was added

-- Find donors without userId that might match users
SELECT 
    d."Id" as DonorId,
    d."FirstName",
    d."LastName",
    d."Email" as DonorEmail,
    d."UserId",
    u."Id" as UserId,
    u."Email" as UserEmail,
    u."Role"
FROM "Donors" d
LEFT JOIN "Users" u ON 
    (d."Email" IS NOT NULL AND LOWER(d."Email") = LOWER(u."Email"))
    OR (LOWER(d."FirstName" || '.' || COALESCE(d."LastName", '')) = LOWER(u."Email"))
WHERE d."UserId" IS NULL
  AND u."Role" = 'Donor';

-- To update a specific donor with their userId:
-- UPDATE "Donors" 
-- SET "UserId" = 'USER_ID_HERE'
-- WHERE "Id" = 'DONOR_ID_HERE';

-- Example:
-- UPDATE "Donors" 
-- SET "UserId" = '12345678-1234-1234-1234-123456789abc'
-- WHERE "Id" = '87654321-4321-4321-4321-cba987654321';
