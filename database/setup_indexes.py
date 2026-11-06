"""
MergeMate — Database Index Initialization Script
------------------------------------------------
Creates all required MongoDB collections and performance indexes:
- Unique index on users.email
- Compound unique index on project_members (project_id + user_id)
- Query optimization indexes on tasks, contributions, projects, and activity_logs
"""

import sys
import os

# Allow running directly or as module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, OperationFailure
from config import Config

def setup_indexes():
    print("=" * 60)
    print("MergeMate: Initializing MongoDB Collections and Indexes")
    print("=" * 60)
    print(f"Connecting to: {Config.MONGO_URI}")
    print(f"Database: {Config.MONGO_DBNAME}")

    try:
        # Connect to local MongoDB server with a 5-second timeout
        client = MongoClient(Config.MONGO_URI, serverSelectionTimeoutMS=5000)
        # Verify connection
        client.admin.command('ping')
        print(" Connected successfully to MongoDB Community Server.")
    except ConnectionFailure as e:
        print("\n [ERROR] Could not connect to MongoDB server!")
        print(f"Details: {e}")
        print("\nTroubleshooting tips for Windows:")
        print("1. Ensure MongoDB Community Server is installed.")
        print("2. Open Windows Services (services.msc) and ensure 'MongoDB Server (MongoDB)' is Running.")
        print("3. Alternatively, open Command Prompt as Administrator and run:")
        print("   net start MongoDB")
        print("4. Verify that MongoDB is listening on 127.0.0.1:27017")
        sys.exit(1)

    db = client[Config.MONGO_DBNAME]

    collections_to_init = [
        "users",
        "projects",
        "tasks",
        "contributions",
        "activity_logs",
        "project_members"
    ]

    for col in collections_to_init:
        if col not in db.list_collection_names():
            db.create_collection(col)
            print(f" Created collection: '{col}'")
        else:
            print(f" Verified existing collection: '{col}'")

    print("\nCreating indexes...")

    # 1. users: unique index on email
    db.users.create_index([("email", ASCENDING)], unique=True, name="idx_users_email_unique")
    print(" [users] Created unique index on 'email'")

    # 2. project_members: compound unique index on project_id and user_id
    db.project_members.create_index(
        [("project_id", ASCENDING), ("user_id", ASCENDING)],
        unique=True,
        name="idx_proj_member_compound_unique"
    )
    print(" [project_members] Created compound unique index on ('project_id', 'user_id')")
    db.project_members.create_index([("user_id", ASCENDING)], name="idx_project_members_user_id")

    # 3. projects indexes
    db.projects.create_index([("project_name", ASCENDING)], name="idx_projects_name")
    db.projects.create_index([("status", ASCENDING)], name="idx_projects_status")
    db.projects.create_index([("deadline", ASCENDING)], name="idx_projects_deadline")
    db.projects.create_index([("project_lead", ASCENDING)], name="idx_projects_lead")
    print(" [projects] Created indexes on 'status', 'deadline', and 'project_lead'")

    # 4. tasks indexes
    db.tasks.create_index([("project_id", ASCENDING)], name="idx_tasks_project_id")
    db.tasks.create_index([("assigned_to", ASCENDING)], name="idx_tasks_assigned_to")
    db.tasks.create_index([("status", ASCENDING)], name="idx_tasks_status")
    db.tasks.create_index([("deadline", ASCENDING)], name="idx_tasks_deadline")
    db.tasks.create_index([("priority", ASCENDING)], name="idx_tasks_priority")
    print(" [tasks] Created indexes on 'project_id', 'assigned_to', 'status', 'deadline', 'priority'")

    # 5. contributions indexes
    db.contributions.create_index([("project_id", ASCENDING)], name="idx_contrib_project_id")
    db.contributions.create_index([("user_id", ASCENDING)], name="idx_contrib_user_id")
    db.contributions.create_index([("task_id", ASCENDING)], name="idx_contrib_task_id")
    db.contributions.create_index([("contribution_date", DESCENDING)], name="idx_contrib_date")
    print(" [contributions] Created indexes on 'project_id', 'user_id', 'task_id', 'contribution_date'")

    # 6. activity_logs indexes
    db.activity_logs.create_index([("timestamp", DESCENDING)], name="idx_logs_timestamp")
    db.activity_logs.create_index([("project_id", ASCENDING)], name="idx_logs_project_id")
    db.activity_logs.create_index([("user_id", ASCENDING)], name="idx_logs_user_id")
    print(" [activity_logs] Created indexes on 'timestamp', 'project_id', 'user_id'")

    print("\n All collections and indexes successfully initialized!")
    print("=" * 60)

if __name__ == "__main__":
    setup_indexes()
