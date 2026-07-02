import os

folders = [
    "backend/config",
    "backend/models",
    "backend/routes",
    "backend/controllers",
    "backend/middleware",
    "backend/uploads/resumes",
    "frontend/css",
    "frontend/js",
    "frontend/pages",
    "frontend/assets/images",
    "frontend/assets/icons",
    "database",
    "docs"
]

files = [
    "backend/.env",
    "backend/check_db.js",
    "backend/config/db.js",
    "backend/controllers/authController.js",
    "backend/controllers/companyController.js",
    "backend/controllers/interviewController.js",
    "backend/middleware/authMiddleware.js",
    "backend/models/Company.js",
    "backend/models/Feedback.js",
    "backend/models/Interview.js",
    "backend/models/User.js",
    "backend/package.json",
    "backend/routes/authRoutes.js",
    "backend/routes/companyRoutes.js",
    "backend/routes/interviewRoutes.js",
    "backend/server.js",
    "database/procedures.sql",
    "database/sample_data.sql",
    "database/schema.sql",
    "docs/ER_Diagram.png",
    "docs/Project_Report.docx",
    "docs/SRS.pdf",
    "frontend/css/addInterview.css",
    "frontend/css/analytics.css",
    "frontend/css/applications.css",
    "frontend/css/dashboard.css",
    "frontend/css/login.css",
    "frontend/css/pages.css",
    "frontend/css/profile.css",
    "frontend/css/register.css",
    "frontend/css/style.css",
    "frontend/index.html",
    "frontend/js/addInterview.js",
    "frontend/js/analytics.js",
    "frontend/js/app.js",
    "frontend/js/applications.js",
    "frontend/js/dashboard.js",
    "frontend/js/dataService.js",
    "frontend/js/login.js",
    "frontend/js/profile.js",
    "frontend/js/register.js",
    "frontend/pages/addInterview.html",
    "frontend/pages/analytics.html",
    "frontend/pages/applications.html",
    "frontend/pages/blog.html",
    "frontend/pages/cookies.html",
    "frontend/pages/dashboard.html",
    "frontend/pages/disclaimer.html",
    "frontend/pages/documentation.html",
    "frontend/pages/faq.html",
    "frontend/pages/login.html",
    "frontend/pages/pricing.html",
    "frontend/pages/privacy.html",
    "frontend/pages/profile.html",
    "frontend/pages/register.html",
    "frontend/pages/terms.html",
    "README.md"
]

for folder in folders:
    os.makedirs(folder, exist_ok=True)

for file in files:
    open(file, "a").close()

print("Project structure created successfully!")