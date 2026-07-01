# Task Manager API

A backend RESTful API for team-based task management, built with **Node.js**, **Express**, **TypeScript**, **Prisma ORM**, and **PostgreSQL**. The project supports JWT authentication, role-based access control (RBAC), and features a complete audit history for task status updates. It also includes comprehensive integration test suites using **Jest** and **Supertest**.

---

## 🚀 Features

### 👤 Authentication & Authorization
* **User Accounts:** Users can register (`POST /users`) and start sessions (`POST /sessions`).
* **JWT Authentication:** All private routes are protected by JWT tokens.
* **Role-Based Access Control (RBAC):**
  * **`admin`**: Full administrative rights to manage teams, team members, and all tasks.
  * **`member`**: Permissions to manage tasks assigned to them, view team members, and check tasks within their teams.

### 👥 Team Management
* **CRUD Teams:** Admins can create, list, update, and delete teams.
* **Manage Team Members:** Admins can add members to teams and remove them.
* **List Members:** Authorized members can list all colleagues in a specific team.

### 📋 Task Management
* **CRUD Tasks:** Create, read, update, and delete tasks.
* **Filtering:** List tasks with query filters for `status` (`pending`, `in_progress`, `completed`) and `priority` (`low`, `medium`, `high`).
* **Task Assignment:** Tasks can be assigned/reassigned to members of the corresponding team.
* **Access Control rules:** Members can only edit or delete tasks assigned to them, and can only create tasks for teams they belong to.

### 📜 Task Status History (Audit Trail)
* **Auditing:** Every time a task's status changes, an audit record is automatically saved in the `tasks_history` table detailing who made the change, the old status, the new status, and the timestamp.
* **History Logs:** Fetch the chronological status timeline of any task via `/tasks/:taskId/history`.

---

## 🛠️ Tech Stack

* **Runtime:** Node.js (with TypeScript)
* **Framework:** Express.js
* **ORM:** Prisma ORM
* **Database:** PostgreSQL (with Docker Compose support)
* **Validation:** Zod
* **Auth:** JSON Web Token (JWT) & Bcrypt (password hashing)
* **Testing:** Jest & Supertest

---

## 🏃 Getting Started

### 📋 Prerequisites
Ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* [Docker & Docker Compose](https://www.docker.com/)

### 🔧 Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd task-manager
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Copy the example environment file and adjust the connection details if necessary:
   ```bash
   cp .env.example .env
   ```
   *Make sure your `DATABASE_URL` matches your PostgreSQL database credentials.*

4. **Spin up the Database (Docker):**
   Start the PostgreSQL container in the background using docker-compose:
   ```bash
   docker compose up -d
   ```

5. **Run database migrations:**
   Apply database schemas and generate Prisma client:
   ```bash
   npx prisma migrate dev
   ```

6. **Start the development server:**
   ```bash
   npm run dev
   ```
   *The server will be running on the port specified in your `.env` (default is `http://localhost:3333`).*

---

## 🧪 Running Tests

The test suite runs integration tests against the database. Tables are wiped between test runs to ensure consistency.

To run the test suite:
```bash
npm run test
```

---

## 🛰️ API Endpoints

### 🔑 Authentication
* `POST /users` - Register a new user (defaults to `member` role)
* `POST /sessions` - Login with email and password to receive a JWT token

### 👥 Teams
* `POST /teams` - Create a team (*Admin only*)
* `GET /teams` - List all teams (*Admin only*)
* `PUT /teams/:id` - Update a team (*Admin only*)
* `DELETE /teams/:id` - Delete a team (*Admin only*)

### 🔗 Team Members
* `POST /teams/:teamId/members` - Add a user to a team (*Admin only*)
* `DELETE /teams/:teamId/members/:userId` - Remove a user from a team (*Admin only*)
* `GET /teams/:teamId/members` - List all members of a team

### 📋 Tasks
* `POST /tasks` - Create a task
* `GET /tasks` - List tasks (supports query params: `?status=...&priority=...`)
* `PUT /tasks/:id` - Update task details or change task status
* `DELETE /tasks/:id` - Delete a task
* `PATCH /tasks/:id/assign` - Assign task to a user in the same team

### 📜 Tasks History
* `GET /tasks/:taskId/history` - Fetch chronological status audit logs for a task
