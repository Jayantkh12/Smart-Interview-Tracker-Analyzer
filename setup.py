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
    "backend/server.js",
    "backend/package.json",
    "backend/config/db.js",
    "backend/models/User.js",
    "backend/models/Company.js",
    "backend/models/Interview.js",
    "backend/models/Feedback.js",
    "backend/routes/authRoutes.js",
    "backend/routes/interviewRoutes.js",
    "backend/routes/companyRoutes.js",
    "backend/controllers/authController.js",
    "backend/controllers/interviewController.js",
    "backend/controllers/companyController.js",
    "backend/middleware/authMiddleware.js",
    "frontend/index.html",
    "frontend/css/style.css",
    "frontend/css/dashboard.css",
    "frontend/css/login.css",
    "frontend/js/app.js",
    "frontend/js/dashboard.js",
    "frontend/js/analytics.js",
    "frontend/pages/login.html",
    "frontend/pages/register.html",
    "frontend/pages/dashboard.html",
    "frontend/pages/addInterview.html",
    "frontend/pages/analytics.html",
    "database/schema.sql",
    "database/sample_data.sql",
    "database/procedures.sql",
    "docs/SRS.pdf",
    "docs/ER_Diagram.png",
    "docs/Project_Report.docx",
    "README.md"
]

for folder in folders:
    os.makedirs(folder, exist_ok=True)

for file in files:
    open(file, "a").close()

print("Project structure created successfully!")