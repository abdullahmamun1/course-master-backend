# CourseMaster - Backend API

A RESTful API for the CourseMaster E-learning platform built with Node.js, Express, and MongoDB.

Video Link: https://drive.google.com/file/d/1vjMrBxr0-7xqjxMX2EBEBw30D_av1pOu/view

**Demo accounts** (created by `npm run seed`):

| Role | Email | Password |
|---|---|---|
| Admin | admin@coursemaster.com | admin123 |
| Student | student@coursemaster.com | student123 |

> **Bug bash:** 56 bugs across the backend and frontend were found, fixed and verified. See [Bug bash fixes](#bug-bash-fixes) below.

## Project Name & Description

**CourseMaster Backend** provides a comprehensive RESTful API for managing an E-learning platform. It handles authentication, course management, enrollments, assignments, quizzes, and administrative operations. The backend is built with Node.js and Express.js, using MongoDB for data storage and JWT for authentication.

## Technology Stack

- **Node.js** - Runtime environment
- **Express.js 5** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **Zod** - Input validation

## Installation

1. Clone the repository
2. Navigate to the backend directory:
   ```bash
   cd course-master-backend
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a `.env` file in the root directory (see `.env.example`)

5. Seed demo data (optional):
   ```bash
   npm run seed
   ```
   > ⚠️ The seed script **deletes all users, courses, enrollments and submissions** in the database `MONGODB_URI` points to before inserting demo data. Run it only against a local or test database, never a shared one.

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Start the production server:
   ```bash
   npm start
   ```

**Tip for local testing:** set `EMAIL_USER` and `EMAIL_PASSWORD` to empty values so test sign-ups don't send real welcome emails.

## Environment Variables

Create a `.env` file in the root directory with the following variables (see `.env.example` for reference):

```env
# Server Configuration
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/coursemaster

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Admin Registration Key (Optional - for admin account creation)
ADMIN_REGISTRATION_KEY=your-secret-admin-key-here

# Node Environment
NODE_ENV=development

# Email Configuration (Optional - for welcome emails)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
FRONTEND_URL=http://localhost:5173
```

**Required Variables:**
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string (required)
- `JWT_SECRET` - Secret key for JWT token generation (required)

**Optional Variables:**
- `NODE_ENV` - Environment mode (development/production)
- `ADMIN_REGISTRATION_KEY` - Secret key for admin account registration (optional)
  - If set, users can register as admin by providing this key during registration
  - If not set, admin registration via key is disabled
  - Admins can still be created manually in the database
- `EMAIL_SERVICE` - Email service provider (gmail, smtp, etc.)
- `EMAIL_USER` - Email address for sending welcome emails
- `EMAIL_PASSWORD` - Email password or app password
- `FRONTEND_URL` - Frontend URL for email links

**Note for Email Setup:**
- For Gmail, you need to:
  1. Enable 2-Factor Authentication
  2. Generate an App Password (not your regular password)
  3. Use the App Password in `EMAIL_PASSWORD`
- If email is not configured, the app will still work but won't send welcome emails

## API Documentation

Base URL: `http://localhost:5000/api` (or the port set in `PORT`)

**Authentication:** protected endpoints need `Authorization: Bearer <token>` (the raw token without `Bearer ` is also accepted). Every authenticated request re-checks the user in the database:
- missing, invalid or expired token → `401`
- user no longer exists → `401`
- user is banned → `403`

Role changes made by an admin take effect immediately, without a new login.

### Authentication Endpoints

#### Register
- **POST** `/api/auth/register`
- **Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "adminKey": "optional-admin-key" 
  }
  ```
- **Response:** User object with token
- **Note:** 
  - By default, users are registered as "student"
  - To register as "admin", provide a valid `adminKey` that matches `ADMIN_REGISTRATION_KEY` in environment variables
  - If an invalid admin key is provided, registration fails with `400 Invalid admin registration key` and no account is created
  - A `role` field in the body is ignored. The role comes only from the admin key
- **Validation errors** return `400` with the first problem as `message` and every problem in `errors`:
  ```json
  {
    "message": "name: Too small: expected string to have >=2 characters",
    "errors": [
      { "field": "name", "message": "Too small: expected string to have >=2 characters" },
      { "field": "password", "message": "Too small: expected string to have >=6 characters" }
    ]
  }
  ```

#### Login
- **POST** `/api/auth/login`
- **Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Response:** User object with token
- **Note:** Banned accounts are rejected with `400 Your account has been banned`

#### Get Current User
- **GET** `/api/auth/me`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** User object

### Course Endpoints (Public)

#### Get All Courses
- **GET** `/api/courses`
- **Query Parameters:**
  - `page` - Page number (default: 1)
  - `limit` - Items per page (default: 8)
  - `search` - Search by title or instructor
  - `sort` - Sort by price: `price_asc` or `price_desc`
  - `category` - Filter by category
  - `tags` - Filter by tags (comma-separated)
- **Response:** Paginated courses list

#### Get Course by ID
- **GET** `/api/courses/:id`
- **Response:** Course object with full details

> **Quiz answer keys are hidden.** Both course endpoints are public, but `syllabus.lessons.quiz.correctIndex` is removed from the response unless the request carries a valid **admin** token. Students receive the correct answers only for a quiz they have submitted (see Quiz Endpoints).

### Enrollment Endpoints (Protected - Student)

#### Enroll in Course
- **POST** `/api/enrollments/:courseId`
- **Headers:** `Authorization: Bearer <token>`
- **Body (optional):**
  ```json
  {
    "batchId": "batch-id-here"
  }
  ```
- **Response:** `201` Enrollment object
- **Errors:**
  - `400 Course not found`
  - `400 Already enrolled in this course`
  - `400 Invalid batch for this course`: `batchId` must be the `_id` of one of the course's `batches`

#### Get My Enrollments
- **GET** `/api/enrollments/my`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Array of enrollment objects

#### Mark Lesson as Complete
- **PATCH** `/api/enrollments/:enrollId/complete-lesson`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "lessonId": "lesson-id-here"
  }
  ```
- **Response:** Updated enrollment object, saved before the response is sent
- **Rules:**
  - Only the student who owns the enrollment can update it; anyone else gets `400 Enrollment not found`
  - `lessonId` must be a lesson in the enrolled course; otherwise `400 Lesson not found in this course`
  - `progress.percent` counts only lessons that still exist in the course

### Assignment Endpoints (Protected - Student)

#### Submit Assignment
- **POST** `/api/assignments/submit`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "courseId": "course-id",
    "lessonId": "lesson-id",
    "answer": "Answer text or Google Drive link",
    "answerType": "text" // or "link"
  }
  ```
- **Response:** Assignment submission object

#### Get My Submissions
- **GET** `/api/assignments/my`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Array of assignment submissions

### Quiz Endpoints (Protected - Student)

#### Submit Quiz
- **POST** `/api/quizzes/submit`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "courseId": "course-id",
    "lessonId": "lesson-id",
    "answers": [0, 1, 2, 0] // Array of selected option indices
  }
  ```
- **Response:**
  ```json
  {
    "_id": "submission-id",
    "total": 4,
    "score": 3,
    "percent": 75,
    "createdAt": "2026-10-23T09:00:00.000Z",
    "correctAnswers": [1, 0, 2, 3]
  }
  ```
  `percent` is out of 100. `correctAnswers` is returned only after submitting, so the player can show the answer review.

#### Get My Quiz Submissions
- **GET** `/api/quizzes/my?courseId=<id>` (courseId optional)
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Array of the student's own submissions. Each includes `correctAnswers` for that lesson, and `course` as `{ _id, title }`

#### Get Quiz Stats
- **GET** `/api/quizzes/stats?courseId=<id>`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `{ average, totalQuizzes, submissions }`, using the latest attempt per lesson

### Admin Endpoints (Protected - Admin Only)

#### Create Course
- **POST** `/api/admin/courses`
- **Headers:** `Authorization: Bearer <token>`
- **Body:** See Course Schema below
- **Response:** Created course object

#### Update Course
- **PATCH** `/api/admin/courses/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Body:** Course fields to update
- **Response:** Updated course object
- **Notes:**
  - Updates run the same schema validation as create. Invalid data returns `400`; a missing course returns `404`
  - When sending `syllabus`, send the full array including each quiz's `correctIndex`. Admins receive it from the course endpoints

#### Delete Course
- **DELETE** `/api/admin/courses/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Success message
- **Note:** The course's enrollments, quiz submissions and assignment submissions are deleted with it

#### Get All Enrollments
- **GET** `/api/admin/enrollments`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `courseId` - Filter by course
  - `batchId` - Filter by batch
- **Response:** Array of enrollment objects

#### Get All Assignments
- **GET** `/api/admin/assignments`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `courseId` - Filter by course (optional)
- **Response:** Array of assignment submissions, each with `lessonTitle` and `assignmentPrompt`

#### Get Analytics
- **GET** `/api/admin/analytics`
- **Headers:** `Authorization: Bearer <token>` (Admin only)
- **Response:** Analytics data including:
  - `chartData`: 30 daily bars, today and the 29 days before it, as `{ date, displayDate, enrollments }`. Dates use the server's local calendar day
  - `enrollmentsByCourse`: top 5 courses as `{ courseName, enrollments }`
  - `stats`: `totalEnrollments`, `totalCourses`, `totalStudents`, `totalInstructors` and `enrollmentsLast30Days`, which equals the sum of the chart bars

#### Users (Admin)
- **GET** `/api/users`: all users, without password hashes
- **PATCH** `/api/users/:id/role`: body `{ "role": "student" | "admin" }`
- **PATCH** `/api/users/:id/ban`: toggles `isBanned`
- **DELETE** `/api/users/:id`
- Admins cannot change, ban or delete their own account

#### Review Assignment
- **PATCH** `/api/admin/assignments/:id/review`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "status": "reviewed",
    "reviewNotes": "Great work!",
    "grade": 95
  }
  ```
- **Response:** Updated assignment submission

## Data Models

### Course Schema
```javascript
{
  title: String (required, trimmed, indexed),
  description: String (required, trimmed),
  instructorName: String (required, trimmed, indexed),
  price: Number (required, min 0),
  category: String (indexed),
  tags: [String] (indexed),
  syllabus: [{
    title: String (required),
    lessons: [{
      title: String (required),
      videoUrl: String (required),
      liveClassLink: String,
      liveClassDate: Date,
      assignmentPrompt: String,
      quiz: [{
        question: String (required, trimmed),
        options: [String] (at least 2, none empty),
        correctIndex: Number (required, 0 <= index < options.length)
      }]
    }]
  }],
  batches: [{
    name: String,
    startDate: Date
  }]
}
```

### User Schema
```javascript
{
  name: String (required),
  email: String (required, unique),
  passwordHash: String (required),
  role: String (enum: ["student", "admin"], default: "student"),
  isBanned: Boolean (default: false)
}
```

### Enrollment Schema
```javascript
{
  student: ObjectId (ref: User),
  course: ObjectId (ref: Course),
  batchId: ObjectId,
  progress: {
    completedLessons: [ObjectId],
    percent: Number (default: 0)
  }
}
```

## Error Handling

All errors follow this format (validation errors also include an `errors` array, see Register):
```json
{
  "message": "Error message here"
}
```

Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid input, failed business rule, malformed IDs)
- `401` - Unauthorized (missing, invalid or expired token, or the user no longer exists)
- `403` - Forbidden (banned user, or a non-admin on an admin route)
- `404` - Not Found
- `500` - Internal Server Error

## Bonus Features

### Email Notifications
- Welcome emails are automatically sent to new users upon registration
- Uses Nodemailer for email delivery
- Configure email settings in `.env` file
- Email sending is non-blocking (won't fail registration if email fails)

### Analytics Dashboard
- Admin analytics dashboard with enrollment trends
- Charts showing enrollments over the last 30 days
- Top courses by enrollment statistics
- Platform-wide statistics (total enrollments, courses, students, instructors)
- Accessible at `/admin/analytics` (admin only)

## Admin Registration

Admins can be created in two ways:

1. **Registration Key Method (Recommended)**:
   - Set `ADMIN_REGISTRATION_KEY` in your `.env` file
   - During registration, provide the admin key in the registration form
   - If the key matches, the user will be created as "admin"
   - If the key is invalid or missing, registration will fail or create a student account

2. **Manual Database Method**:
   - Create admin users directly in the database
   - Set the `role` field to "admin" in the User document

**Note**: If `ADMIN_REGISTRATION_KEY` is not set in `.env`, admin registration via key is disabled for security.

## Security Features

- Password hashing with bcrypt (verified with `bcrypt.compare`)
- JWT token-based authentication; invalid or expired tokens are rejected with `401`
- Every authenticated request re-checks the user, so bans, deletions and role changes apply immediately
- Admin-only routes with role checking
- Admin registration key protection; `role` in the request body is ignored
- Students can only change their own enrollment progress
- Quiz answer keys are hidden from non-admins until the student submits
- User names are HTML-escaped in welcome emails
- Input validation with Zod (auth) and Mongoose schema validation (courses, including updates)
- CORS enabled

## Database Indexing

The following fields are indexed for performance:
- Course: `title`, `instructorName`, `category`, `tags`
- Enrollment: `{student: 1, course: 1}` (unique compound index)

## Deployment

The backend is deployed on **Vercel**. Make sure to set all environment variables in your deployment platform.

## Development

- Development server runs on `http://localhost:5000` (default)
- Uses `nodemon` for auto-restart during development
- MongoDB connection is handled via Mongoose

## Bug Bash Fixes

The project went through a full bug bash. Every fix is a separate commit on `main` with the bug ID in the message (for example `BE-03: ...`), so `git log --oneline` lists them all. The full report, with steps to reproduce, expected vs actual results, severity, evidence and verification for every bug, is in the [CourseMaster Bug Report](https://docs.google.com/document/d/1Nk1A2tTov8aiVeYTyYsiVXiJO_SywFZ_1XDkKmBBZ-8/edit) (Google Doc).

Backend fixes:

| ID | Severity | Fix |
|---|---|---|
| BE-01 | Critical | Login always failed: password is now checked with `bcrypt.compare` instead of plain-text comparison |
| BE-02 | Critical | Invalid or expired JWTs passed the auth middleware; they now get `401` |
| BE-03 | Critical | Enrolling in a new course returned "Already enrolled" (inverted check) |
| BE-04 | High | Quiz percent was calculated out of 10 instead of 100 |
| BE-05 | High | Any student could mark lessons complete on another student's enrollment |
| BE-06 | High | Lesson progress was not awaited before responding, so save errors were lost |
| BE-07 | Medium | Lesson IDs from outside the course could be marked complete |
| BE-08 | High | The admin registration key was ignored |
| BE-09 | High | Banned users could still log in and use the API |
| BE-10 | Medium | Deleting a course left its enrollments and submissions behind |
| BE-11 | Medium | Courses accepted a negative price and a blank title, including on update |
| BE-12 | Low | Validation errors didn't say which field was wrong |
| BE-13 | Low | The admin assignments `courseId` filter was ignored |
| BE-14 | Medium | Quiz answer keys were returned by the public course API |
| BE-15 | Low | The user's name was inserted unescaped into welcome-email HTML |
| BE-17 | Low | The "last 30 days" count covered 31 days |
| BE-18 | Medium | The analytics chart dropped today's enrollments in timezones ahead of UTC |
| FE-05, AD-06 | High, Medium | Batch and quiz validation on the server (paired with frontend fixes) |

Also investigated: the `Access-Control-Allow-Methods: GET, POST` middleware in `app.js` did **not** block PUT, PATCH or DELETE, because `cors()` answers the preflight first. It was removed as misleading code, together with an unused `hash.js` (BE-16). The frontend fixes (FE-xx, AD-xx) are listed in the frontend README.

