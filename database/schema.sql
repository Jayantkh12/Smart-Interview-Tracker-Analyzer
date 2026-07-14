-- ============================================================
-- Smart Interview Tracker - Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS Project;
USE Project;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS Users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phoneNo VARCHAR(15) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    profile_photo VARCHAR(255),
    college VARCHAR(255),
    branch VARCHAR(100),
    graduation_year INT,
    preferred_role VARCHAR(100),
    expected_package VARCHAR(50),
    preferred_location VARCHAR(100),
    work_type ENUM('Remote', 'On-site', 'Hybrid'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE IF NOT EXISTS Companies (
    company_id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(256) NOT NULL,
    company_email VARCHAR(100) UNIQUE NOT NULL,
    company_location VARCHAR(256) NOT NULL,
    package_lpa DECIMAL(5, 2)
);

-- ============================================================
-- APPLICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS Applications (
    application_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    company_id INT NOT NULL,
    role VARCHAR(100) NOT NULL,
    application_date DATE NOT NULL,
    status ENUM(
        'Applied',
        'OA Cleared',
        'Interview Scheduled',
        'Selected',
        'Rejected'
    ) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES Users(id),
    FOREIGN KEY (company_id) REFERENCES Companies(company_id)
);

CREATE INDEX idx_application_status ON Applications(status);

-- ============================================================
-- APPLICATION NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS ApplicationNotes (
    note_id INT PRIMARY KEY AUTO_INCREMENT,
    application_id INT NOT NULL,
    note_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (application_id) REFERENCES Applications(application_id)
);

-- ============================================================
-- APPLICATION SUMMARY VIEW
-- ============================================================
CREATE OR REPLACE VIEW ApplicationSummary AS
    SELECT
        u.name,
        c.company_name,
        a.role,
        a.status,
        a.application_date
    FROM Applications a
    JOIN Users u ON a.user_id = u.id
    JOIN Companies c ON a.company_id = c.company_id;

-- ============================================================
-- INTERVIEW ROUNDS
-- ============================================================
CREATE TABLE IF NOT EXISTS InterviewRounds (
    round_id INT PRIMARY KEY AUTO_INCREMENT,
    application_id INT NOT NULL,
    round_type VARCHAR(50) NOT NULL,
    round_date DATE,
    result VARCHAR(20),

    FOREIGN KEY (application_id) REFERENCES Applications(application_id)
);

-- ============================================================
-- FEEDBACK
-- ============================================================
CREATE TABLE IF NOT EXISTS Feedback (
    feedback_id INT PRIMARY KEY AUTO_INCREMENT,
    round_id INT NOT NULL,
    feedback_text TEXT,
    rating INT CHECK (rating BETWEEN 1 AND 5),

    FOREIGN KEY (round_id) REFERENCES InterviewRounds(round_id)
);

-- ============================================================
-- RESUMES
-- ============================================================
CREATE TABLE IF NOT EXISTS Resumes (
    resume_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    resume_title VARCHAR(100) NOT NULL,
    resume_file VARCHAR(255) NOT NULL,
    upload_date DATE NOT NULL,

    FOREIGN KEY (user_id) REFERENCES Users(id)
);

-- ============================================================
-- RESUME ANALYSIS
-- ============================================================
CREATE TABLE IF NOT EXISTS ResumeAnalysis (
    analysis_id INT PRIMARY KEY AUTO_INCREMENT,
    resume_id INT NOT NULL,
    ats_score INT,
    extracted_skills TEXT,
    missing_skills TEXT,
    suggestions TEXT,

    FOREIGN KEY (resume_id) REFERENCES Resumes(resume_id)
);

-- ============================================================
-- SKILLS
-- ============================================================
CREATE TABLE IF NOT EXISTS Skills (
    skill_id INT PRIMARY KEY AUTO_INCREMENT,
    skill_name VARCHAR(100) UNIQUE NOT NULL
);

-- ============================================================
-- USER SKILLS
-- ============================================================
CREATE TABLE IF NOT EXISTS UserSkills (
    user_id INT,
    skill_id INT,

    PRIMARY KEY (user_id, skill_id),

    FOREIGN KEY (user_id) REFERENCES Users(id),
    FOREIGN KEY (skill_id) REFERENCES Skills(skill_id)
);

-- ============================================================
-- QUESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS Questions (
    question_id INT PRIMARY KEY AUTO_INCREMENT,
    question_text TEXT NOT NULL,
    topic VARCHAR(100),
    difficulty VARCHAR(20)
);

-- ============================================================
-- QUESTION PRACTICE
-- ============================================================
CREATE TABLE IF NOT EXISTS QuestionPractice (
    practice_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    question_id INT NOT NULL,
    solved BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (user_id) REFERENCES Users(id),
    FOREIGN KEY (question_id) REFERENCES Questions(question_id)
);


-- ============================================================
-- PASSWORD FORGOT
-- ============================================================
CREATE TABLE password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    token VARCHAR(255),
    expires_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES Users(id)
);