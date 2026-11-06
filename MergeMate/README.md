# MergeMate — Team Contribution & Project Tracking System
**College DBMS Mini Project** &middot; **MongoDB &amp; Python Flask**

MergeMate is a complete, production-grade DBMS mini-project built specifically for college students and academic presentations. It enables project teams to manage multi-member academic projects, delegate tasks, monitor deadlines, record granular working hours, and generate analytical performance reports using native MongoDB queries and aggregation pipelines.

---

## 1. Technology Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (No heavy frontend frameworks)
- **Backend:** Python 3, Flask (RESTful routing, Jinja2 template engine)
- **Database:** MongoDB Community Server (Local instance, default `mongodb://127.0.0.1:27017/`)
- **Driver / ODM:** PyMongo (Official Python MongoDB driver)
- **Database Visualization:** MongoDB Compass
- **IDE:** Visual Studio Code (VS Code) on Windows 10/11
- **Authentication / API Keys:** **None required.** Fully private local deployment without passwords, accounts, cloud registration, or external APIs.

---

## 2. MongoDB Database Architecture

Database Name: `mergemate_db`

The system organizes data into **six specialized MongoDB collections**:

```
mergemate_db
├── users             (Student profiles, roles, and skills array)
├── projects          (Project deliverables, timelines, leads, member references)
├── tasks             (Task title, priority, status, start date, deadline, completion date)
├── contributions     (Granular logged working hours per user and task)
├── project_members   (Junction collection maintaining many-to-many memberships)
└── activity_logs     (Automated audit trail with timestamps and event descriptions)
```

### Collection Schemas

#### A. `users`
```json
{
  "_id": ObjectId("..."),
  "name": "Sneha Rao",
  "email": "sneha.rao@college.edu",
  "role": "UI/UX Designer & Frontend Lead",
  "skills": ["HTML5", "CSS3", "JavaScript", "Figma"],
  "created_at": ISODate("2026-09-08T10:00:00Z")
}
```
- **Constraint:** Unique index on `email`.

#### B. `projects`
```json
{
  "_id": ObjectId("..."),
  "project_name": "MergeMate Core Platform",
  "description": "Collaborative project tracking system...",
  "start_date": "2026-10-01",
  "deadline": "2026-11-30",
  "status": "In Progress",
  "project_lead": ObjectId("..."),
  "member_ids": [ObjectId("..."), ObjectId("...")],
  "created_at": ISODate("..."),
  "updated_at": ISODate("...")
}
```

#### C. `tasks`
```json
{
  "_id": ObjectId("..."),
  "title": "Design MongoDB Aggregation Pipelines",
  "description": "Construct $lookup, $group, and $cond pipelines...",
  "project_id": ObjectId("..."),
  "assigned_to": ObjectId("..."),
  "priority": "High",
  "start_date": "2026-10-10",
  "deadline": "2026-10-25",
  "status": "Completed",
  "completion_date": "2026-10-24",
  "created_at": ISODate("..."),
  "updated_at": ISODate("...")
}
```
- **Allowed Status:** `"To Do"`, `"In Progress"`, `"Completed"`
- **Allowed Priority:** `"Low"`, `"Medium"`, `"High"`
- **Overdue Rule:** `deadline < today AND status != "Completed"`

#### D. `contributions`
```json
{
  "_id": ObjectId("..."),
  "user_id": ObjectId("..."),
  "project_id": ObjectId("..."),
  "task_id": ObjectId("..."),
  "description": "Formulated $lookup stages joining project_members and tasks.",
  "contribution_date": "2026-10-24",
  "hours_spent": 8.5,
  "created_at": ISODate("...")
}
```
- **Strict Rule:** Hours are calculated **only** from contribution records via `$sum`. Never from task counts or completion states.

#### E. `project_members` (Compound Unique Junction)
```json
{
  "_id": ObjectId("..."),
  "project_id": ObjectId("..."),
  "user_id": ObjectId("..."),
  "assigned_at": ISODate("...")
}
```
- **Constraint:** Compound unique index on `(project_id, user_id)` prevents accidental duplicate membership.

#### F. `activity_logs`
```json
{
  "_id": ObjectId("..."),
  "action_type": "TASK_COMPLETED",
  "project_id": ObjectId("..."),
  "user_id": ObjectId("..."),
  "description": "Completed task 'Design MongoDB Aggregation Pipelines'",
  "timestamp": ISODate("...")
}
```

---

## 3. Windows 10/11 Step-by-Step Installation & Setup

Follow these exact steps on your Windows laptop or desktop:

### Step 1: Install Python
1. Download Python 3.10+ from [python.org](https://www.python.org/downloads/).
2. **Crucial:** During installation, check the box that says **"Add Python to PATH"**.
3. Open Windows Command Prompt (`cmd`) or PowerShell and verify:
   ```cmd
   python --version
   ```
   *Expected output:* `Python 3.10.x` (or newer).

### Step 2: Install MongoDB Community Server
1. Download MongoDB Community Server MSI from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community).
2. Run the installer with default options (**"Install MongoDB as a Service"** should remain checked).
3. Complete the installation. MongoDB will run on default port `27017`.

### Step 3: Install MongoDB Compass (Optional GUI Viewer)
1. Download from [mongodb.com/products/tools/compass](https://www.mongodb.com/products/tools/compass).
2. Connect to `mongodb://127.0.0.1:27017` to visualize your databases and documents.

### Step 4: Verify or Start the MongoDB Windows Service
To start the MongoDB service on Windows:
- Open Command Prompt as **Administrator** and run:
  ```cmd
  net start MongoDB
  ```
- Or press `Win + R`, type `services.msc`, scroll down to **MongoDB Server (MongoDB)**, right-click, and select **Start**.

### Step 5: Open Project in VS Code
1. Open Visual Studio Code.
2. Select **File &rarr; Open Folder...** and select the `MergeMate` directory.

### Step 6: Create and Activate Python Virtual Environment
Open PowerShell inside VS Code (`Ctrl + ~`) and run:
```powershell
python -m venv venv
```
Activate the environment:
- In **PowerShell**:
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
  *(If PowerShell shows an execution policy warning, run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` and retry).*
- In **Command Prompt (CMD)**:
  ```cmd
  .\venv\Scripts\activate.bat
  ```

### Step 7: Install Python Dependencies
```cmd
pip install -r requirements.txt
```

### Step 8: Configure Environment File
Copy the example environment configuration:
```cmd
copy .env.example .env
```
*(Default settings connect to `mongodb://127.0.0.1:27017/` on database `mergemate_db` without any passwords).*

### Step 9: Initialize MongoDB Collections and Indexes
Run the automated index script:
```cmd
python database/setup_indexes.py
```
*Creates all collections and builds unique & compound indexes.*

### Step 10: Import Realistic College Sample Data
Seed the database with 3 realistic projects, 6 team members, 14 tasks, memberships, and contribution logs:
```cmd
python database/sample_data.py
```
*(Includes safety duplicate checks so it never overwrites existing data if executed multiple times).*

### Step 11: Run the MergeMate Flask Application
```cmd
python app.py
```
*Expected terminal output:*
```
============================================================
MergeMate — College DBMS Mini Project
Server starting on: http://127.0.0.1:5000
MongoDB Target: mongodb://127.0.0.1:27017/ (Database: mergemate_db)
============================================================
```

### Step 12: Open in Browser
Open your browser and navigate to:
```
http://127.0.0.1:5000
```

To stop the server: Press `Ctrl + C` in the terminal.

---

## 4. Troubleshooting Common Errors on Windows

| Error Message | Cause | Simple Solution |
| :--- | :--- | :--- |
| `ServerSelectionTimeoutError` / `Connection refused` | MongoDB service is not running on your machine. | Open Admin CMD and run `net start MongoDB` or start it from `services.msc`. |
| `ModuleNotFoundError: No module named 'flask'` | Virtual environment is not activated or packages not installed. | Run `.\venv\Scripts\Activate.ps1` and run `pip install -r requirements.txt`. |
| `OSError: [Errno 48] Address already in use` (Port 5000) | Another application or previous Python instance is using port 5000. | Stop the other process, or run with custom port: `set PORT=5001 && python app.py`. |
| `DuplicateKeyError: E11000 duplicate key error` | Attempting to register an email that already exists in `users`. | Emails must be unique. Choose a different email address. |
| `InvalidId: '...' is not a valid ObjectId` | A URL or form contained a malformed BSON ID string. | MergeMate catches this safely with `parse_object_id()` and renders a 404 alert instead of crashing. |

---

## 5. Comprehensive DBMS Viva Examination Preparation

Use these explanations, concepts, and MergeMate examples to excel in your college viva examination:

### Q1: What is MongoDB?
**Answer:** MongoDB is an open-source, distributed, document-oriented NoSQL database. Instead of storing data in fixed relational tables with rows and columns, MongoDB stores data in flexible, JSON-like **BSON** (Binary JSON) documents.

### Q2: What is the difference between SQL and NoSQL databases?
| Aspect | Relational SQL (e.g. MySQL, Oracle) | NoSQL Document DB (MongoDB) |
| :--- | :--- | :--- |
| **Data Structure** | Structured Tables with predefined Schemas | Dynamic BSON Documents inside Collections |
| **Schema Flexibility**| Rigid schema; `ALTER TABLE` required for changes | Schema-free / Polymorphic document schemas |
| **Relationships** | Enforced Foreign Keys & JOIN operations | Document references (`$lookup`) or Embedded documents |
| **Scaling** | Vertical scaling (Scale-up) | Horizontal scaling (Scale-out via Sharding) |
| **Query Language** | SQL (`SELECT ... FROM ... JOIN`) | MongoDB Query API & Aggregation Pipelines |

### Q3: Define Database, Collection, and Document in MongoDB terms.
- **Database:** A container for collections (e.g., `mergemate_db`).
- **Collection:** A grouping of MongoDB documents (analogous to a SQL Table, e.g., `projects`, `users`, `tasks`).
- **Document:** A set of key-value pairs stored in BSON format (analogous to a SQL Row or Tuple).

### Q4: What is an `ObjectId` and what is its anatomy?
**Answer:** An `ObjectId` is a 12-byte BSON type automatically generated by MongoDB to serve as a globally unique primary key (`_id`).
Its 12 bytes are composed of:
1. **4 bytes:** Unix epoch timestamp (accurate to the second).
2. **5 bytes:** Random machine and process identifier.
3. **3 bytes:** Incrementing counter, initialized to a random value.

*Benefit:* You can extract the exact creation timestamp of any document using `ObjectId.getTimestamp()` without storing an extra timestamp field!

### Q5: What is the difference between Embedding and Referencing?
- **Embedding:** Storing related data within a single document (e.g., storing `skills: ["Python", "Flask"]` inside the user document). Ideal for 1-to-few relationships with atomic read/write advantages.
- **Referencing:** Storing the `_id` of another document (e.g., `project_id: ObjectId(...)` in tasks). Ideal for 1-to-many and many-to-many relationships where sub-documents grow unbounded, preventing document size limits (16 MB cap).

### Q6: Why does MergeMate use six collections?
**Answer:**
1. `users`: Stores core student identity and competencies independently.
2. `projects`: Represents deliverables with distinct timelines and ownership.
3. `project_members`: Decouples project assignment so removing a member does not delete unrelated tasks or historical contributions.
4. `tasks`: Allows discrete status workflows, deadlines, and independent reassignment.
5. `contributions`: Records exact historical hours without mutating original task objects.
6. `activity_logs`: Provides an append-only audit trail for project accountability.

### Q7: How are 1-to-Many and Many-to-Many relationships handled in MergeMate?
- **1-to-Many:** One project has many tasks. Each task document stores `project_id: ObjectId("...")`.
- **Many-to-Many:** Students belong to multiple projects, and projects have multiple students. Handled via the `project_members` collection where each document links `(project_id, user_id)`.

### Q8: What are Indexes in MongoDB and why are they critical?
**Answer:** Without indexes, MongoDB must perform a full collection scan (`COLLSCAN`) inspecting every document to fulfill a query. An index creates an ordered B-Tree data structure allowing logarithmic lookup (`IXSCAN`).
- **Single Field Index:** `db.tasks.create_index([("deadline", 1)])`
- **Unique Index:** `db.users.create_index([("email", 1)], unique=True)` prevents duplicate registrations at the database engine level.
- **Compound Unique Index:** `db.project_members.create_index([("project_id", 1), ("user_id", 1)], unique=True)` enforces that a student cannot be assigned to the same project twice.

### Q9: What is the MongoDB Aggregation Pipeline and what are its key stages?
**Answer:** The Aggregation Pipeline processes documents through sequential stages where each stage transforms the document stream:
- **`$match`:** Filters documents matching specific criteria (like SQL `WHERE` / `HAVING`).
- **`$lookup`:** Performs left outer equi-join with another collection in the same database.
- **`$unwind`:** Deconstructs an array field from input documents to output a document for each element.
- **`$group`:** Groups documents by a specified identifier expression and applies accumulators like `$sum`, `$avg`, `$min`, `$max`.
- **`$project`:** Reshapes documents by adding, renaming, or suppressing fields.
- **`$cond`:** Ternary conditional operator (`{ $cond: { if: <bool>, then: <val>, else: <val> } }`).
- **`$sort`:** Orders documents (1 for ASC, -1 for DESC).

### Q10: How does Document-Oriented design differ from 3NF Relational Normalization?
**Answer:**
Relational normalization (1NF, 2NF, 3NF) seeks to eliminate all data redundancy by splitting data across tables linked by foreign keys, requiring expensive JOIN operations at query time.
In document databases, schema design is governed by **data access patterns**:
- Data accessed together is stored together (like `skills` in `users`).
- Normalized references are used when data represents distinct lifecycles (like `tasks` and `contributions`), balancing query performance with data consistency.

---

## 6. Git & GitHub Upload Instructions

To upload your MergeMate project to GitHub:

1. Open PowerShell / Command Prompt inside the `MergeMate` directory.
2. Initialize git repository:
   ```cmd
   git init
   ```
3. Add all files to staging:
   ```cmd
   git add .
   ```
4. Commit your files:
   ```cmd
   git commit -m "Initial commit: Complete MergeMate DBMS Mini Project with MongoDB and Flask"
   ```
5. Create a new repository on [github.com](https://github.com) named `MergeMate`.
6. Link your local repository and push:
   ```cmd
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/MergeMate.git
   git push -u origin main
   ```

---

## 7. License & Academic Attribution
Created for College Database Management Systems (DBMS) Laboratory Mini-Project submissions. Open for educational and presentation purposes.
