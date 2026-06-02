# 🚀 Smart Interview Tracker & Analyzer

A full-stack web application that helps students and job seekers track job applications, manage interview progress, analyze recruitment performance, and stay organized throughout their placement journey.

---

## 📌 Project Overview

Smart Interview Tracker & Analyzer is designed to provide a centralized platform where users can manage all their job and internship applications in one place. The system enables users to monitor application statuses, track interview rounds, store feedback, and gain valuable insights into their job search process.

---

## ✨ Features

### 👤 User Management

- User Registration & Login
- Secure Authentication
- Profile Management
- Resume Upload and Storage

### 🏢 Company Management

- Add Companies
- Track Applied Roles
- Store Company Information
- Manage Application History

### 🎯 Interview Tracking

- Add Interview Details
- Track Multiple Interview Rounds
- Update Interview Status
- Store Interview Feedback

### 📊 Analytics Dashboard

- Total Applications
- Interview Success Rate
- Application Statistics
- Progress Tracking

### 📁 Resume Management

- Upload Resumes
- Manage Multiple Versions
- Easy Access to Documents

### 🔒 Security

- JWT Authentication
- Protected Routes
- User-Specific Data Access

---

## 🛠️ Technology Stack

### Frontend

- HTML5
- CSS3
- JavaScript (ES6)

### Backend

- Node.js
- Express.js

### Database

- MongoDB / SQL Database

### Authentication

- JSON Web Tokens (JWT)

### File Storage

- Local Storage (`uploads/resumes`)

---

## 📂 Project Structure

```text
Smart-Interview-Tracker-Analyzer
│
├── backend
│   ├── config
│   │   └── db.js
│   ├── models
│   │   ├── User.js
│   │   ├── Company.js
│   │   ├── Interview.js
│   │   └── Feedback.js
│   ├── routes
│   │   ├── authRoutes.js
│   │   ├── interviewRoutes.js
│   │   └── companyRoutes.js
│   ├── controllers
│   │   ├── authController.js
│   │   ├── interviewController.js
│   │   └── companyController.js
│   ├── middleware
│   │   └── authMiddleware.js
│   ├── uploads
│   │   └── resumes
│   ├── server.js
│   └── package.json
│
├── frontend
│   ├── css
│   │   ├── style.css
│   │   ├── dashboard.css
│   │   └── login.css
│   ├── js
│   │   ├── app.js
│   │   ├── dashboard.js
│   │   └── analytics.js
│   ├── pages
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── dashboard.html
│   │   ├── addInterview.html
│   │   └── analytics.html
│   ├── assets
│   │   ├── images
│   │   └── icons
│   └── index.html
│
├── database
│   ├── schema.sql
│   ├── sample_data.sql
│   └── procedures.sql
│
├── docs
│   ├── SRS.pdf
│   ├── ER_Diagram.png
│   └── Project_Report.docx
│
└── README.md
```

---

## ⚙️ Installation

### Clone the Repository

```bash
git clone https://github.com/your-username/Smart-Interview-Tracker-Analyzer.git
```

### Navigate to Project Folder

```bash
cd Smart-Interview-Tracker-Analyzer
```

### Install Backend Dependencies

```bash
cd backend
npm install
```

### Configure Environment Variables

Create a `.env` file inside the backend folder:

```env
PORT=5000
MONGO_URI=your_database_connection_string
JWT_SECRET=your_secret_key
```

### Run Server

```bash
npm start
```

or

```bash
npm run dev
```

---

## 📈 Future Enhancements

- AI-Based Interview Analysis
- Automatic Email Parsing
- Resume Scoring System
- Interview Preparation Assistant
- Placement Prediction Analytics
- Company-Wise Performance Insights
- Job Recommendation Engine

---

## 🤝 Contributing

Contributions are welcome.

1. Fork the repository
2. Create a new branch

```bash
git checkout -b feature-name
```

3. Commit changes

```bash
git commit -m "Added new feature"
```

4. Push changes

```bash
git push origin feature-name
```

5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Jayant Choudhary**

Computer Science Engineering Student
Delhi Technological University (DTU)

Email: [jayantchoudhary2901@gmail.com](mailto:jayantchoudhary2901@gmail.com)

---

⭐ If you found this project useful, consider giving it a star on GitHub!
