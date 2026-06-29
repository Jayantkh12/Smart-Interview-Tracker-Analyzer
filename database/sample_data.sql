-- ============================================================
-- Smart Interview Tracker - Sample Data
-- ============================================================

USE Project;

-- Sample Users
INSERT INTO Users (name, email, phoneNo, password) 
VALUES ('Jayant', 'jayant@gmail.com', '7850078064', 'pass123');

-- Sample Companies
INSERT INTO Companies (company_name, company_email, company_location) 
VALUES 
    ('Google', 'hr@google.com', 'Bangalore'),
    ('Microsoft', 'hr@microsoft.com', 'Hyderabad');

-- Sample Applications
INSERT INTO Applications (user_id, company_id, role, application_date, status) 
VALUES (1, 1, 'SDE Intern', '2026-05-30', 'Applied');
