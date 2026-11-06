"""
MergeMate — Realistic Sample Data Import Script
------------------------------------------------
Seeds the database with sample projects, members, tasks, memberships,
contributions, and activity logs.

Safety Guarantee:
- Performs duplicate checking on each entity (by user email, project name, etc.)
- Never deletes or overwrites existing data!
"""

import sys
import os
from datetime import datetime, timedelta

# Allow running directly or as module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bson import ObjectId
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from config import Config

def seed_sample_data():
    print("=" * 60)
    print("MergeMate: Importing Realistic College DBMS Sample Data")
    print("=" * 60)

    try:
        client = MongoClient(Config.MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        print(" Connected to MongoDB server.")
    except ConnectionFailure as e:
        print("\n [ERROR] Could not connect to MongoDB server!")
        print(f"Details: {e}")
        print("Please start your local MongoDB service and try again.")
        sys.exit(1)

    db = client[Config.MONGO_DBNAME]

    now = datetime.now()

    # 1. Team Members (Users)
    members_seed = [
        {
            "name": "Aarav Patel",
            "email": "aarav.patel@college.edu",
            "role": "Full-Stack Developer",
            "skills": ["Python", "Flask", "MongoDB", "JavaScript"],
            "created_at": now - timedelta(days=60)
        },
        {
            "name": "Sneha Rao",
            "email": "sneha.rao@college.edu",
            "role": "UI/UX Designer & Frontend Lead",
            "skills": ["HTML5", "CSS3", "JavaScript", "Figma"],
            "created_at": now - timedelta(days=58)
        },
        {
            "name": "Rohan Sharma",
            "email": "rohan.sharma@college.edu",
            "role": "Backend Engineer",
            "skills": ["Python", "PyMongo", "REST APIs", "SQL"],
            "created_at": now - timedelta(days=55)
        },
        {
            "name": "Priya Nair",
            "email": "priya.nair@college.edu",
            "role": "Database Architect",
            "skills": ["MongoDB Aggregations", "Schema Design", "Data Modeling"],
            "created_at": now - timedelta(days=50)
        },
        {
            "name": "Vikram Malhotra",
            "email": "vikram.m@college.edu",
            "role": "QA & DevOps Tester",
            "skills": ["Automated Testing", "Git", "Security Auditing"],
            "created_at": now - timedelta(days=45)
        },
        {
            "name": "Ananya Iyer",
            "email": "ananya.iyer@college.edu",
            "role": "Technical Documentation Specialist",
            "skills": ["Technical Writing", "API Docs", "Research"],
            "created_at": now - timedelta(days=40)
        }
    ]

    user_map = {}
    users_added = 0
    for u in members_seed:
        existing = db.users.find_one({"email": u["email"]})
        if not existing:
            res = db.users.insert_one(u)
            user_map[u["name"]] = res.inserted_id
            users_added += 1
            print(f" [+] Inserted member: {u['name']} ({u['email']})")
        else:
            user_map[u["name"]] = existing["_id"]
            print(f" [=] Member already exists: {u['name']}")

    # 2. Projects
    projects_seed = [
        {
            "project_name": "MergeMate Core Platform",
            "description": "Collaborative DBMS mini-project tracking system with MongoDB aggregation analytics and hours tracking.",
            "start_date": (now - timedelta(days=35)).strftime("%Y-%m-%d"),
            "deadline": (now + timedelta(days=25)).strftime("%Y-%m-%d"),
            "status": "In Progress",
            "project_lead_name": "Aarav Patel",
            "member_names": ["Aarav Patel", "Sneha Rao", "Rohan Sharma", "Priya Nair"]
        },
        {
            "project_name": "Smart Campus Transit System",
            "description": "Real-time college bus route tracking and schedule notification portal for campus students.",
            "start_date": (now - timedelta(days=45)).strftime("%Y-%m-%d"),
            "deadline": (now + timedelta(days=5)).strftime("%Y-%m-%d"),
            "status": "In Progress",
            "project_lead_name": "Sneha Rao",
            "member_names": ["Sneha Rao", "Rohan Sharma", "Vikram Malhotra"]
        },
        {
            "project_name": "EcoTrack Carbon Footprint Dashboard",
            "description": "College environmental sustainability tracker measuring dormitory energy usage and paper recycling metrics.",
            "start_date": (now - timedelta(days=50)).strftime("%Y-%m-%d"),
            "deadline": (now - timedelta(days=2)).strftime("%Y-%m-%d"), # Past deadline for realistic testing
            "status": "In Progress",
            "project_lead_name": "Priya Nair",
            "member_names": ["Priya Nair", "Vikram Malhotra", "Ananya Iyer"]
        }
    ]

    project_map = {}
    projects_added = 0
    for p in projects_seed:
        existing = db.projects.find_one({"project_name": p["project_name"]})
        lead_id = user_map.get(p["project_lead_name"])
        member_ids = [user_map[m] for m in p["member_names"] if m in user_map]

        if not existing:
            doc = {
                "project_name": p["project_name"],
                "description": p["description"],
                "start_date": p["start_date"],
                "deadline": p["deadline"],
                "status": p["status"],
                "project_lead": lead_id,
                "member_ids": member_ids,
                "created_at": now - timedelta(days=30),
                "updated_at": now
            }
            res = db.projects.insert_one(doc)
            project_map[p["project_name"]] = res.inserted_id
            projects_added += 1
            print(f" [+] Inserted project: {p['project_name']}")
        else:
            project_map[p["project_name"]] = existing["_id"]
            print(f" [=] Project already exists: {p['project_name']}")

    # 3. Project Members collection (explicit membership documents)
    memberships_added = 0
    for p in projects_seed:
        proj_id = project_map[p["project_name"]]
        for m_name in p["member_names"]:
            u_id = user_map[m_name]
            existing_m = db.project_members.find_one({"project_id": proj_id, "user_id": u_id})
            if not existing_m:
                db.project_members.insert_one({
                    "project_id": proj_id,
                    "user_id": u_id,
                    "assigned_at": now - timedelta(days=28)
                })
                memberships_added += 1

    print(f" [i] Verified project memberships (Added: {memberships_added})")

    # 4. Tasks (15 realistic tasks covering To Do, In Progress, Completed, Overdue, Low, Medium, High)
    tasks_seed = [
        # Project 1: MergeMate Core Platform
        {
            "title": "Design MongoDB Aggregation Pipelines",
            "description": "Construct $lookup, $group, and $cond pipelines for student workload and contribution reports.",
            "project": "MergeMate Core Platform",
            "assigned_to": "Priya Nair",
            "priority": "High",
            "start_date": (now - timedelta(days=25)).strftime("%Y-%m-%d"),
            "deadline": (now - timedelta(days=10)).strftime("%Y-%m-%d"),
            "status": "Completed",
            "completion_date": (now - timedelta(days=11)).strftime("%Y-%m-%d")
        },
        {
            "title": "Develop Flask REST Routes & Templates",
            "description": "Implement CRUD controllers for projects, members, tasks, and contributions with error handling.",
            "project": "MergeMate Core Platform",
            "assigned_to": "Aarav Patel",
            "priority": "High",
            "start_date": (now - timedelta(days=20)).strftime("%Y-%m-%d"),
            "deadline": (now + timedelta(days=5)).strftime("%Y-%m-%d"),
            "status": "In Progress",
            "completion_date": None
        },
        {
            "title": "Build Responsive CSS Layout & Sidebar",
            "description": "Create professional SaaS dashboard layout with light theme, responsive table grids and modals.",
            "project": "MergeMate Core Platform",
            "assigned_to": "Sneha Rao",
            "priority": "Medium",
            "start_date": (now - timedelta(days=18)).strftime("%Y-%m-%d"),
            "deadline": (now - timedelta(days=8)).strftime("%Y-%m-%d"),
            "status": "Completed",
            "completion_date": (now - timedelta(days=8)).strftime("%Y-%m-%d")
        },
        {
            "title": "Implement PyMongo Index Scripts",
            "description": "Define compound unique index on project_members and single-field search indexes.",
            "project": "MergeMate Core Platform",
            "assigned_to": "Rohan Sharma",
            "priority": "Medium",
            "start_date": (now - timedelta(days=15)).strftime("%Y-%m-%d"),
            "deadline": (now - timedelta(days=5)).strftime("%Y-%m-%d"),
            "status": "Completed",
            "completion_date": (now - timedelta(days=6)).strftime("%Y-%m-%d")
        },
        {
            "title": "Dynamic Member and Task Filter UI",
            "description": "Vanilla JavaScript event listeners for dynamic member filtering by project on task/contribution forms.",
            "project": "MergeMate Core Platform",
            "assigned_to": "Sneha Rao",
            "priority": "Low",
            "start_date": (now - timedelta(days=5)).strftime("%Y-%m-%d"),
            "deadline": (now + timedelta(days=7)).strftime("%Y-%m-%d"),
            "status": "In Progress",
            "completion_date": None
        },
        {
            "title": "Comprehensive Unit & Integration Testing",
            "description": "Verify edge cases including duplicate email rejection, invalid ObjectId, and cascade protection.",
            "project": "MergeMate Core Platform",
            "assigned_to": "Aarav Patel",
            "priority": "High",
            "start_date": (now + timedelta(days=2)).strftime("%Y-%m-%d"),
            "deadline": (now + timedelta(days=15)).strftime("%Y-%m-%d"),
            "status": "To Do",
            "completion_date": None
        },

        # Project 2: Smart Campus Transit System
        {
            "title": "Design GPS Route Geofencing Schema",
            "description": "Document specifications for bus stop coordinates and scheduled arrival delays.",
            "project": "Smart Campus Transit System",
            "assigned_to": "Rohan Sharma",
            "priority": "High",
            "start_date": (now - timedelta(days=30)).strftime("%Y-%m-%d"),
            "deadline": (now - timedelta(days=14)).strftime("%Y-%m-%d"),
            "status": "Completed",
            "completion_date": (now - timedelta(days=15)).strftime("%Y-%m-%d")
        },
        {
            "title": "Campus Route Mobile Responsive Map View",
            "description": "Mobile-optimized SVG schedule table and station checklist for students.",
            "project": "Smart Campus Transit System",
            "assigned_to": "Sneha Rao",
            "priority": "Medium",
            "start_date": (now - timedelta(days=12)).strftime("%Y-%m-%d"),
            "deadline": (now + timedelta(days=3)).strftime("%Y-%m-%d"),
            "status": "In Progress",
            "completion_date": None
        },
        {
            "title": "Load Testing for Peak Campus Rush Hours",
            "description": "Simulate 500 concurrent student queries during 8:30 AM college rush hour.",
            "project": "Smart Campus Transit System",
            "assigned_to": "Vikram Malhotra",
            "priority": "High",
            "start_date": (now - timedelta(days=10)).strftime("%Y-%m-%d"),
            "deadline": (now - timedelta(days=2)).strftime("%Y-%m-%d"), # Overdue!
            "status": "In Progress",
            "completion_date": None
        },
        {
            "title": "SMS Gateway Integration for Emergency Delays",
            "description": "Send broadcast alerts when rain or mechanical breakdown delays bus routes.",
            "project": "Smart Campus Transit System",
            "assigned_to": "Rohan Sharma",
            "priority": "Low",
            "start_date": (now + timedelta(days=1)).strftime("%Y-%m-%d"),
            "deadline": (now + timedelta(days=14)).strftime("%Y-%m-%d"),
            "status": "To Do",
            "completion_date": None
        },

        # Project 3: EcoTrack Carbon Footprint Dashboard
        {
            "title": "Dormitory Electricity Meter Data Importer",
            "description": "Parse hourly kilowatt-hour CSV logs from hostel smart meters into MongoDB documents.",
            "project": "EcoTrack Carbon Footprint Dashboard",
            "assigned_to": "Priya Nair",
            "priority": "High",
            "start_date": (now - timedelta(days=35)).strftime("%Y-%m-%d"),
            "deadline": (now - timedelta(days=20)).strftime("%Y-%m-%d"),
            "status": "Completed",
            "completion_date": (now - timedelta(days=21)).strftime("%Y-%m-%d")
        },
        {
            "title": "Carbon Reduction Milestone Aggregations",
            "description": "Compute weekly savings comparisons against college semester targets using MongoDB $group.",
            "project": "EcoTrack Carbon Footprint Dashboard",
            "assigned_to": "Priya Nair",
            "priority": "Medium",
            "start_date": (now - timedelta(days=15)).strftime("%Y-%m-%d"),
            "deadline": (now - timedelta(days=3)).strftime("%Y-%m-%d"), # Overdue!
            "status": "To Do",
            "completion_date": None
        },
        {
            "title": "Environmental Audit Report Generation",
            "description": "Draft executive PDF summary for Dean of Student Affairs detailing recycling metrics.",
            "project": "EcoTrack Carbon Footprint Dashboard",
            "assigned_to": "Ananya Iyer",
            "priority": "Low",
            "start_date": (now - timedelta(days=10)).strftime("%Y-%m-%d"),
            "deadline": (now + timedelta(days=6)).strftime("%Y-%m-%d"),
            "status": "In Progress",
            "completion_date": None
        },
        {
            "title": "Security Review of Sensor Data Ingestion",
            "description": "Verify that API endpoints reject unauthenticated packet injection from campus Wi-Fi.",
            "project": "EcoTrack Carbon Footprint Dashboard",
            "assigned_to": "Vikram Malhotra",
            "priority": "High",
            "start_date": (now - timedelta(days=8)).strftime("%Y-%m-%d"),
            "deadline": (now - timedelta(days=1)).strftime("%Y-%m-%d"), # Overdue!
            "status": "In Progress",
            "completion_date": None
        }
    ]

    task_map = {}
    tasks_added = 0
    for t in tasks_seed:
        proj_id = project_map.get(t["project"])
        user_id = user_map.get(t["assigned_to"])
        if not proj_id or not user_id:
            continue

        existing_task = db.tasks.find_one({"title": t["title"], "project_id": proj_id})
        if not existing_task:
            task_doc = {
                "title": t["title"],
                "description": t["description"],
                "project_id": proj_id,
                "assigned_to": user_id,
                "priority": t["priority"],
                "start_date": t["start_date"],
                "deadline": t["deadline"],
                "status": t["status"],
                "completion_date": t["completion_date"],
                "created_at": now - timedelta(days=20),
                "updated_at": now
            }
            res = db.tasks.insert_one(task_doc)
            task_map[t["title"]] = res.inserted_id
            tasks_added += 1
            print(f" [+] Inserted task: '{t['title']}' ({t['status']})")
        else:
            task_map[t["title"]] = existing_task["_id"]
            print(f" [=] Task already exists: '{t['title']}'")

    # 5. Contributions (Strictly authentic hours recorded per user/task/project)
    contributions_seed = [
        {
            "user": "Priya Nair",
            "project": "MergeMate Core Platform",
            "task": "Design MongoDB Aggregation Pipelines",
            "hours_spent": 8.5,
            "description": "Formulated $lookup stages joining project_members and tasks; benchmarked index execution speed.",
            "days_ago": 12
        },
        {
            "user": "Sneha Rao",
            "project": "MergeMate Core Platform",
            "task": "Build Responsive CSS Layout & Sidebar",
            "hours_spent": 6.0,
            "description": "Built clean Tailwind-inspired CSS styling, collapsible sidebar, and accessible modal views.",
            "days_ago": 9
        },
        {
            "user": "Rohan Sharma",
            "project": "MergeMate Core Platform",
            "task": "Implement PyMongo Index Scripts",
            "hours_spent": 4.5,
            "description": "Wrote automated index scripts verifying uniqueness on emails and compound membership pairs.",
            "days_ago": 7
        },
        {
            "user": "Aarav Patel",
            "project": "MergeMate Core Platform",
            "task": "Develop Flask REST Routes & Templates",
            "hours_spent": 12.0,
            "description": "Coded core Flask routes, Jinja templates, ObjectId parameter validation, and flash feedback messages.",
            "days_ago": 4
        },
        {
            "user": "Rohan Sharma",
            "project": "Smart Campus Transit System",
            "task": "Design GPS Route Geofencing Schema",
            "hours_spent": 5.5,
            "description": "Created bus coordinates mapping and validated schema against 12 campus bus routes.",
            "days_ago": 16
        },
        {
            "user": "Sneha Rao",
            "project": "Smart Campus Transit System",
            "task": "Campus Route Mobile Responsive Map View",
            "hours_spent": 4.0,
            "description": "Created interactive SVG route diagram showing live bus stop indicators.",
            "days_ago": 3
        },
        {
            "user": "Priya Nair",
            "project": "EcoTrack Carbon Footprint Dashboard",
            "task": "Dormitory Electricity Meter Data Importer",
            "hours_spent": 7.0,
            "description": "Wrote resilient CSV intake script parsing 5,000 hourly power readings into MongoDB.",
            "days_ago": 22
        },
        {
            "user": "Ananya Iyer",
            "project": "EcoTrack Carbon Footprint Dashboard",
            "task": "Environmental Audit Report Generation",
            "hours_spent": 3.5,
            "description": "Drafted initial introduction and methodology sections for student hostel audit.",
            "days_ago": 2
        }
    ]

    contribs_added = 0
    for c in contributions_seed:
        u_id = user_map.get(c["user"])
        p_id = project_map.get(c["project"])
        t_id = task_map.get(c["task"])
        if not (u_id and p_id and t_id):
            continue

        c_date = (now - timedelta(days=c["days_ago"])).strftime("%Y-%m-%d")
        existing_c = db.contributions.find_one({
            "user_id": u_id,
            "task_id": t_id,
            "description": c["description"]
        })
        if not existing_c:
            db.contributions.insert_one({
                "user_id": u_id,
                "project_id": p_id,
                "task_id": t_id,
                "description": c["description"],
                "contribution_date": c_date,
                "hours_spent": float(c["hours_spent"]),
                "created_at": now - timedelta(days=c["days_ago"])
            })
            contribs_added += 1
            print(f" [+] Inserted contribution: {c['user']} ({c['hours_spent']} hrs)")

    # 6. Activity Logs
    if db.activity_logs.count_documents({}) == 0:
        logs_seed = [
            ("PROJECT_CREATED", project_map["MergeMate Core Platform"], user_map["Aarav Patel"], "Created project 'MergeMate Core Platform'", 35),
            ("MEMBER_ASSIGNED", project_map["MergeMate Core Platform"], user_map["Sneha Rao"], "Assigned Sneha Rao to MergeMate Core Platform", 28),
            ("TASK_COMPLETED", project_map["MergeMate Core Platform"], user_map["Priya Nair"], "Completed task 'Design MongoDB Aggregation Pipelines'", 11),
            ("CONTRIBUTION_RECORDED", project_map["MergeMate Core Platform"], user_map["Aarav Patel"], "Recorded 12.0 hours of contribution", 4),
            ("PROJECT_CREATED", project_map["Smart Campus Transit System"], user_map["Sneha Rao"], "Created project 'Smart Campus Transit System'", 45),
            ("TASK_COMPLETED", project_map["Smart Campus Transit System"], user_map["Rohan Sharma"], "Completed task 'Design GPS Route Geofencing Schema'", 15)
        ]
        for action, p_id, u_id, desc, days_ago in logs_seed:
            db.activity_logs.insert_one({
                "action_type": action,
                "project_id": p_id,
                "user_id": u_id,
                "description": desc,
                "timestamp": now - timedelta(days=days_ago)
            })
        print(" [+] Seeded initial activity logs.")

    print("\n" + "=" * 60)
    print(f"Sample data summary:")
    print(f"Total Users: {db.users.count_documents({})}")
    print(f"Total Projects: {db.projects.count_documents({})}")
    print(f"Total Tasks: {db.tasks.count_documents({})}")
    print(f"Total Contributions: {db.contributions.count_documents({})}")
    print(f"Total Memberships: {db.project_members.count_documents({})}")
    print(f"Total Activity Logs: {db.activity_logs.count_documents({})}")
    print("=" * 60)
    print("Sample data import completed successfully without data loss!")

if __name__ == "__main__":
    seed_sample_data()
