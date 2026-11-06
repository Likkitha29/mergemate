"""
MergeMate — Team Contribution & Project Tracking System
=======================================================
College DBMS Mini Project
Backend: Python 3 & Flask
Database: MongoDB Community Server via PyMongo
"""

import os
from datetime import datetime, date, timedelta
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from bson import ObjectId
from bson.errors import InvalidId
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, DuplicateKeyError, OperationFailure
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

# MongoDB Client Initialization
# Using serverSelectionTimeoutMS to quickly detect if local MongoDB is running
try:
    mongo_client = MongoClient(Config.MONGO_URI, serverSelectionTimeoutMS=2500)
    db = mongo_client[Config.MONGO_DBNAME]
except Exception as e:
    mongo_client = None
    db = None

def get_db():
    """Verify and return active MongoDB database or None if unavailable."""
    global mongo_client, db
    try:
        if mongo_client is None:
            mongo_client = MongoClient(Config.MONGO_URI, serverSelectionTimeoutMS=2000)
            db = mongo_client[Config.MONGO_DBNAME]
        mongo_client.admin.command('ping')
        return db
    except Exception:
        return None

def parse_object_id(id_str):
    """Safely validate and convert string to BSON ObjectId."""
    try:
        return ObjectId(str(id_str).strip())
    except (InvalidId, TypeError, ValueError):
        return None

def log_activity(action_type, description, project_id=None, user_id=None):
    """Record an audit event to the activity_logs collection."""
    database = get_db()
    if database is None:
        return
    try:
        log_entry = {
            "action_type": action_type,
            "project_id": parse_object_id(project_id) if project_id else None,
            "user_id": parse_object_id(user_id) if user_id else None,
            "description": description,
            "timestamp": datetime.now()
        }
        database.activity_logs.insert_one(log_entry)
    except Exception as e:
        app.logger.warning(f"Failed to write activity log: {e}")

# Context processor to inject helper variables into all templates
@app.context_processor
def inject_globals():
    return {
        "current_year": datetime.now().year,
        "today_str": date.today().strftime("%Y-%m-%d"),
        "now": datetime.now()
    }

# Error handlers
@app.errorhandler(404)
def page_not_found(e):
    return render_template('error.html', error_title="404 - Page Not Found",
                           error_message="The requested page or document does not exist in MergeMate.",
                           show_db_help=False), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('error.html', error_title="500 - Internal Server Error",
                           error_message="An unexpected server error occurred.",
                           show_db_help=True), 500


# ==============================================================================
# 1. DASHBOARD MODULE
# ==============================================================================
@app.route('/')
def dashboard():
    database = get_db()
    if database is None:
        return render_template('error.html',
                               error_title="MongoDB Server Not Connected",
                               error_message="MergeMate cannot reach MongoDB at " + Config.MONGO_URI,
                               show_db_help=True)

    today_str = date.today().strftime("%Y-%m-%d")

    # Metrics calculated directly from MongoDB collections
    total_projects = database.projects.count_documents({})
    total_members = database.users.count_documents({})
    total_tasks = database.tasks.count_documents({})
    completed_tasks = database.tasks.count_documents({"status": "Completed"})
    pending_tasks = database.tasks.count_documents({"status": {"$ne": "Completed"}})

    # Overdue tasks: deadline < today AND status != Completed
    overdue_tasks = database.tasks.count_documents({
        "status": {"$ne": "Completed"},
        "deadline": {"$lt": today_str}
    })

    # Overall completion percentage (prevent division by zero)
    overall_progress = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0

    # Project-by-project progress using MongoDB Aggregation
    project_pipeline = [
        {
            "$lookup": {
                "from": "tasks",
                "localField": "_id",
                "foreignField": "project_id",
                "as": "project_tasks"
            }
        },
        {
            "$lookup": {
                "from": "users",
                "localField": "project_lead",
                "foreignField": "_id",
                "as": "lead_info"
            }
        },
        {
            "$project": {
                "project_name": 1,
                "status": 1,
                "deadline": 1,
                "start_date": 1,
                "lead_name": {"$arrayElemAt": ["$lead_info.name", 0]},
                "total_tasks": {"$size": "$project_tasks"},
                "completed_tasks": {
                    "$size": {
                        "$filter": {
                            "input": "$project_tasks",
                            "as": "t",
                            "cond": {"$eq": ["$$t.status", "Completed"]}
                        }
                    }
                }
            }
        },
        {"$sort": {"deadline": 1}}
    ]
    projects_progress = list(database.projects.aggregate(project_pipeline))

    for p in projects_progress:
        t_cnt = p.get("total_tasks", 0)
        c_cnt = p.get("completed_tasks", 0)
        p["progress_pct"] = round((c_cnt / t_cnt * 100), 1) if t_cnt > 0 else 0
        p["is_overdue"] = p.get("deadline", "") < today_str and p.get("status") != "Completed"

    # Upcoming project deadlines (projects due today or in future, sorted by deadline)
    upcoming_projects = list(database.projects.find({
        "status": {"$ne": "Completed"}
    }).sort("deadline", ASCENDING).limit(5))

    # Recent activity logs with lookup on users and projects
    activity_pipeline = [
        {"$sort": {"timestamp": -1}},
        {"$limit": 8},
        {
            "$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "_id",
                "as": "user_doc"
            }
        },
        {
            "$lookup": {
                "from": "projects",
                "localField": "project_id",
                "foreignField": "_id",
                "as": "project_doc"
            }
        },
        {
            "$project": {
                "action_type": 1,
                "description": 1,
                "timestamp": 1,
                "user_name": {"$arrayElemAt": ["$user_doc.name", 0]},
                "project_name": {"$arrayElemAt": ["$project_doc.project_name", 0]}
            }
        }
    ]
    recent_activities = list(database.activity_logs.aggregate(activity_pipeline))

    # Total recorded contribution hours across team
    contrib_sum = list(database.contributions.aggregate([
        {"$group": {"_id": None, "total_hours": {"$sum": "$hours_spent"}}}
    ]))
    total_hours = contrib_sum[0]["total_hours"] if contrib_sum else 0.0

    return render_template('dashboard.html',
                           total_projects=total_projects,
                           total_members=total_members,
                           total_tasks=total_tasks,
                           completed_tasks=completed_tasks,
                           pending_tasks=pending_tasks,
                           overdue_tasks=overdue_tasks,
                           overall_progress=overall_progress,
                           projects_progress=projects_progress,
                           upcoming_projects=upcoming_projects,
                           recent_activities=recent_activities,
                           total_hours=round(total_hours, 1))


# ==============================================================================
# 2. PROJECT MANAGEMENT MODULE
# ==============================================================================
@app.route('/projects')
def list_projects():
    database = get_db()
    if database is None:
        return render_template('error.html', error_title="Database Unavailable",
                               error_message="Cannot connect to MongoDB.", show_db_help=True)

    status_filter = request.args.get('status', '').strip()
    search_query = request.args.get('search', '').strip()

    match_stage = {}
    if status_filter:
        match_stage["status"] = status_filter
    if search_query:
        match_stage["project_name"] = {"$regex": search_query, "$options": "i"}

    pipeline = [
        {"$match": match_stage} if match_stage else {"$match": {}},
        {
            "$lookup": {
                "from": "users",
                "localField": "project_lead",
                "foreignField": "_id",
                "as": "lead"
            }
        },
        {
            "$lookup": {
                "from": "tasks",
                "localField": "_id",
                "foreignField": "project_id",
                "as": "tasks"
            }
        },
        {
            "$lookup": {
                "from": "project_members",
                "localField": "_id",
                "foreignField": "project_id",
                "as": "members"
            }
        },
        {
            "$project": {
                "project_name": 1,
                "description": 1,
                "start_date": 1,
                "deadline": 1,
                "status": 1,
                "project_lead": 1,
                "lead_name": {"$arrayElemAt": ["$lead.name", 0]},
                "member_count": {"$size": "$members"},
                "total_tasks": {"$size": "$tasks"},
                "completed_tasks": {
                    "$size": {
                        "$filter": {
                            "input": "$tasks",
                            "as": "t",
                            "cond": {"$eq": ["$$t.status", "Completed"]}
                        }
                    }
                }
            }
        },
        {"$sort": {"deadline": 1}}
    ]

    projects = list(database.projects.aggregate(pipeline))
    today_str = date.today().strftime("%Y-%m-%d")

    for p in projects:
        tot = p.get("total_tasks", 0)
        comp = p.get("completed_tasks", 0)
        p["progress"] = round((comp / tot * 100), 1) if tot > 0 else 0
        p["is_overdue"] = p.get("deadline", "") < today_str and p.get("status") != "Completed"

    return render_template('projects.html',
                           projects=projects,
                           status_filter=status_filter,
                           search_query=search_query)


@app.route('/projects/create', methods=['GET', 'POST'])
def create_project():
    database = get_db()
    if database is None:
        flash("Database offline. Start MongoDB to continue.", "error")
        return redirect(url_for('list_projects'))

    users = list(database.users.find().sort("name", ASCENDING))

    if request.method == 'POST':
        project_name = request.form.get('project_name', '').strip()
        description = request.form.get('description', '').strip()
        start_date = request.form.get('start_date', '').strip()
        deadline = request.form.get('deadline', '').strip()
        status = request.form.get('status', 'In Progress').strip()
        project_lead_str = request.form.get('project_lead', '').strip()

        # Validation
        if not project_name:
            flash("Project name is required.", "error")
            return render_template('project_form.html', project=None, users=users)
        if not start_date or not deadline:
            flash("Start date and deadline are required.", "error")
            return render_template('project_form.html', project=None, users=users)
        if deadline < start_date:
            flash("Deadline cannot be earlier than start date.", "error")
            return render_template('project_form.html', project=None, users=users)

        lead_id = parse_object_id(project_lead_str)
        if not lead_id or not database.users.find_one({"_id": lead_id}):
            flash("Please select a valid team member as project lead.", "error")
            return render_template('project_form.html', project=None, users=users)

        # Check duplicate project name
        if database.projects.find_one({"project_name": {"$regex": f"^{project_name}$", "$options": "i"}}):
            flash(f"A project named '{project_name}' already exists.", "error")
            return render_template('project_form.html', project=None, users=users)

        now = datetime.now()
        new_project = {
            "project_name": project_name,
            "description": description,
            "start_date": start_date,
            "deadline": deadline,
            "status": status,
            "project_lead": lead_id,
            "member_ids": [lead_id],
            "created_at": now,
            "updated_at": now
        }

        result = database.projects.insert_one(new_project)
        new_project_id = result.inserted_id

        # Automatically assign the project lead into project_members collection
        database.project_members.update_one(
            {"project_id": new_project_id, "user_id": lead_id},
            {"$setOnInsert": {"project_id": new_project_id, "user_id": lead_id, "assigned_at": now}},
            upsert=True
        )

        log_activity("PROJECT_CREATED", f"Created project '{project_name}'", project_id=new_project_id, user_id=lead_id)
        flash(f"Project '{project_name}' created successfully!", "success")
        return redirect(url_for('project_details', project_id=str(new_project_id)))

    return render_template('project_form.html', project=None, users=users)


@app.route('/projects/<project_id>')
def project_details(project_id):
    database = get_db()
    p_id = parse_object_id(project_id)
    if not database or not p_id:
        flash("Invalid project ID.", "error")
        return redirect(url_for('list_projects'))

    project = database.projects.find_one({"_id": p_id})
    if not project:
        flash("Project not found.", "error")
        return redirect(url_for('list_projects'))

    # Retrieve Project Lead
    lead = database.users.find_one({"_id": project.get("project_lead")}) if project.get("project_lead") else None

    # Retrieve all members assigned to this project via $lookup
    members_pipeline = [
        {"$match": {"project_id": p_id}},
        {
            "$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "_id",
                "as": "user"
            }
        },
        {"$unwind": "$user"},
        {
            "$project": {
                "membership_id": "$_id",
                "user_id": "$user._id",
                "name": "$user.name",
                "email": "$user.email",
                "role": "$user.role",
                "skills": "$user.skills",
                "assigned_at": "$assigned_at"
            }
        },
        {"$sort": {"name": 1}}
    ]
    assigned_members = list(database.project_members.aggregate(members_pipeline))
    assigned_member_ids = [m["user_id"] for m in assigned_members]

    # Available users who are NOT yet assigned to this project
    available_users = list(database.users.find({
        "_id": {"$nin": assigned_member_ids}
    }).sort("name", ASCENDING))

    # Retrieve tasks for this project with assigned member info
    tasks_pipeline = [
        {"$match": {"project_id": p_id}},
        {
            "$lookup": {
                "from": "users",
                "localField": "assigned_to",
                "foreignField": "_id",
                "as": "assignee"
            }
        },
        {
            "$project": {
                "title": 1,
                "description": 1,
                "priority": 1,
                "status": 1,
                "start_date": 1,
                "deadline": 1,
                "completion_date": 1,
                "assigned_to": 1,
                "assignee_name": {"$arrayElemAt": ["$assignee.name", 0]}
            }
        },
        {"$sort": {"deadline": 1}}
    ]
    tasks = list(database.tasks.aggregate(tasks_pipeline))

    today_str = date.today().strftime("%Y-%m-%d")
    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.get("status") == "Completed")
    pending_tasks = total_tasks - completed_tasks
    overdue_tasks = sum(1 for t in tasks if t.get("status") != "Completed" and t.get("deadline", "") < today_str)
    progress_pct = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0

    # Total recorded contribution hours for this project
    contrib_sum = list(database.contributions.aggregate([
        {"$match": {"project_id": p_id}},
        {"$group": {"_id": None, "total_hours": {"$sum": "$hours_spent"}}}
    ]))
    project_hours = contrib_sum[0]["total_hours"] if contrib_sum else 0.0

    return render_template('project_details.html',
                           project=project,
                           lead=lead,
                           members=assigned_members,
                           available_users=available_users,
                           tasks=tasks,
                           total_tasks=total_tasks,
                           completed_tasks=completed_tasks,
                           pending_tasks=pending_tasks,
                           overdue_tasks=overdue_tasks,
                           progress_pct=progress_pct,
                           project_hours=round(project_hours, 1))


@app.route('/projects/<project_id>/edit', methods=['GET', 'POST'])
def edit_project(project_id):
    database = get_db()
    p_id = parse_object_id(project_id)
    if not database or not p_id:
        flash("Invalid project ID.", "error")
        return redirect(url_for('list_projects'))

    project = database.projects.find_one({"_id": p_id})
    if not project:
        flash("Project not found.", "error")
        return redirect(url_for('list_projects'))

    users = list(database.users.find().sort("name", ASCENDING))

    if request.method == 'POST':
        project_name = request.form.get('project_name', '').strip()
        description = request.form.get('description', '').strip()
        start_date = request.form.get('start_date', '').strip()
        deadline = request.form.get('deadline', '').strip()
        status = request.form.get('status', 'In Progress').strip()
        project_lead_str = request.form.get('project_lead', '').strip()

        if not project_name or not start_date or not deadline:
            flash("All required fields must be filled.", "error")
            return render_template('project_form.html', project=project, users=users)

        if deadline < start_date:
            flash("Deadline cannot be earlier than start date.", "error")
            return render_template('project_form.html', project=project, users=users)

        lead_id = parse_object_id(project_lead_str)
        if not lead_id or not database.users.find_one({"_id": lead_id}):
            flash("Selected project lead is invalid.", "error")
            return render_template('project_form.html', project=project, users=users)

        # Ensure project lead is in project_members
        database.project_members.update_one(
            {"project_id": p_id, "user_id": lead_id},
            {"$setOnInsert": {"project_id": p_id, "user_id": lead_id, "assigned_at": datetime.now()}},
            upsert=True
        )

        database.projects.update_one(
            {"_id": p_id},
            {"$set": {
                "project_name": project_name,
                "description": description,
                "start_date": start_date,
                "deadline": deadline,
                "status": status,
                "project_lead": lead_id,
                "updated_at": datetime.now()
            },
            "$addToSet": {"member_ids": lead_id}}
        )

        log_activity("PROJECT_UPDATED", f"Updated details for project '{project_name}'", project_id=p_id)
        flash(f"Project '{project_name}' updated successfully.", "success")
        return redirect(url_for('project_details', project_id=str(p_id)))

    return render_template('project_form.html', project=project, users=users)


@app.route('/projects/<project_id>/delete', methods=['POST'])
def delete_project(project_id):
    database = get_db()
    p_id = parse_object_id(project_id)
    if not database or not p_id:
        flash("Invalid project ID.", "error")
        return redirect(url_for('list_projects'))

    project = database.projects.find_one({"_id": p_id})
    if not project:
        flash("Project not found.", "error")
        return redirect(url_for('list_projects'))

    # Check safe deletion: if tasks or contributions exist, clean them up or log
    task_count = database.tasks.count_documents({"project_id": p_id})
    contrib_count = database.contributions.count_documents({"project_id": p_id})

    # Safe cascade cleanup of project sub-entities
    database.tasks.delete_many({"project_id": p_id})
    database.contributions.delete_many({"project_id": p_id})
    database.project_members.delete_many({"project_id": p_id})
    database.projects.delete_one({"_id": p_id})

    log_activity("PROJECT_DELETED", f"Deleted project '{project.get('project_name')}' along with {task_count} tasks and {contrib_count} contribution records.")
    flash(f"Project '{project.get('project_name')}' deleted successfully.", "success")
    return redirect(url_for('list_projects'))


# ==============================================================================
# 3. PROJECT MEMBERSHIP MANAGEMENT MODULE
# ==============================================================================
@app.route('/projects/<project_id>/members/add', methods=['POST'])
def add_project_member(project_id):
    database = get_db()
    p_id = parse_object_id(project_id)
    if not database or not p_id:
        flash("Invalid project ID.", "error")
        return redirect(url_for('list_projects'))

    user_id_str = request.form.get('user_id', '').strip()
    u_id = parse_object_id(user_id_str)

    if not u_id or not database.users.find_one({"_id": u_id}):
        flash("Please select a valid team member.", "error")
        return redirect(url_for('project_details', project_id=str(p_id)))

    # Prevent duplicate membership using compound check
    existing = database.project_members.find_one({"project_id": p_id, "user_id": u_id})
    if existing:
        flash("Member is already assigned to this project.", "warning")
        return redirect(url_for('project_details', project_id=str(p_id)))

    # Insert into project_members
    database.project_members.insert_one({
        "project_id": p_id,
        "user_id": u_id,
        "assigned_at": datetime.now()
    })

    # Also keep project.member_ids synchronized
    database.projects.update_one({"_id": p_id}, {"$addToSet": {"member_ids": u_id}})

    user = database.users.find_one({"_id": u_id})
    log_activity("MEMBER_ASSIGNED", f"Assigned {user.get('name')} to project", project_id=p_id, user_id=u_id)
    flash(f"{user.get('name')} was successfully added to the project.", "success")
    return redirect(url_for('project_details', project_id=str(p_id)))


@app.route('/projects/<project_id>/members/<user_id>/remove', methods=['POST'])
def remove_project_member(project_id, user_id):
    database = get_db()
    p_id = parse_object_id(project_id)
    u_id = parse_object_id(user_id)
    if not database or not p_id or not u_id:
        flash("Invalid IDs provided.", "error")
        return redirect(url_for('list_projects'))

    # Check project lead rule
    project = database.projects.find_one({"_id": p_id})
    if project and project.get("project_lead") == u_id:
        flash("Cannot remove the project lead. Change the project lead first.", "error")
        return redirect(url_for('project_details', project_id=str(p_id)))

    # Safe removal check: Prevent removal if active (non-completed) tasks are assigned to this member!
    active_tasks = database.tasks.count_documents({
        "project_id": p_id,
        "assigned_to": u_id,
        "status": {"$ne": "Completed"}
    })
    if active_tasks > 0:
        flash(f"Cannot remove member: They have {active_tasks} active task(s) in this project. Please reassign or complete them first.", "error")
        return redirect(url_for('project_details', project_id=str(p_id)))

    database.project_members.delete_one({"project_id": p_id, "user_id": u_id})
    database.projects.update_one({"_id": p_id}, {"$pull": {"member_ids": u_id}})

    user = database.users.find_one({"_id": u_id})
    u_name = user.get("name") if user else "Member"
    log_activity("MEMBER_REMOVED", f"Removed {u_name} from project", project_id=p_id, user_id=u_id)
    flash(f"{u_name} was removed from the project.", "success")
    return redirect(url_for('project_details', project_id=str(p_id)))


# ==============================================================================
# 4. TEAM MEMBER (USER) MANAGEMENT MODULE
# ==============================================================================
@app.route('/members')
def list_members():
    database = get_db()
    if database is None:
        return render_template('error.html', error_title="Database Offline",
                               error_message="Cannot connect to MongoDB.", show_db_help=True)

    # MongoDB Aggregation to compute member metrics (assigned projects, completed/pending tasks, total hours)
    pipeline = [
        {
            "$lookup": {
                "from": "project_members",
                "localField": "_id",
                "foreignField": "user_id",
                "as": "memberships"
            }
        },
        {
            "$lookup": {
                "from": "tasks",
                "localField": "_id",
                "foreignField": "assigned_to",
                "as": "tasks"
            }
        },
        {
            "$lookup": {
                "from": "contributions",
                "localField": "_id",
                "foreignField": "user_id",
                "as": "contribs"
            }
        },
        {
            "$project": {
                "name": 1,
                "email": 1,
                "role": 1,
                "skills": 1,
                "created_at": 1,
                "projects_count": {"$size": "$memberships"},
                "tasks_count": {"$size": "$tasks"},
                "completed_tasks": {
                    "$size": {
                        "$filter": {
                            "input": "$tasks",
                            "as": "t",
                            "cond": {"$eq": ["$$t.status", "Completed"]}
                        }
                    }
                },
                "pending_tasks": {
                    "$size": {
                        "$filter": {
                            "input": "$tasks",
                            "as": "t",
                            "cond": {"$ne": ["$$t.status", "Completed"]}
                        }
                    }
                },
                "total_hours": {"$sum": "$contribs.hours_spent"}
            }
        },
        {"$sort": {"name": 1}}
    ]

    members = list(database.users.aggregate(pipeline))
    return render_template('members.html', members=members)


@app.route('/members/create', methods=['GET', 'POST'])
def create_member():
    database = get_db()
    if database is None:
        flash("Database unavailable.", "error")
        return redirect(url_for('list_members'))

    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip().lower()
        role = request.form.get('role', '').strip()
        skills_raw = request.form.get('skills', '').strip()

        if not name or not email or not role:
            flash("Name, email, and role are required.", "error")
            return render_template('member_form.html', member=None)

        # Validate unique email
        if database.users.find_one({"email": email}):
            flash(f"A member with email '{email}' already exists.", "error")
            return render_template('member_form.html', member=None)

        # Parse skills to array
        skills_array = [s.strip() for s in skills_raw.split(',') if s.strip()]

        new_user = {
            "name": name,
            "email": email,
            "role": role,
            "skills": skills_array,
            "created_at": datetime.now()
        }

        try:
            res = database.users.insert_one(new_user)
            log_activity("MEMBER_CREATED", f"Registered new team member '{name}' ({role})", user_id=res.inserted_id)
            flash(f"Member '{name}' added successfully!", "success")
            return redirect(url_for('member_details', member_id=str(res.inserted_id)))
        except DuplicateKeyError:
            flash(f"Email '{email}' is already registered.", "error")
            return render_template('member_form.html', member=None)

    return render_template('member_form.html', member=None)


@app.route('/members/<member_id>')
def member_details(member_id):
    database = get_db()
    u_id = parse_object_id(member_id)
    if not database or not u_id:
        flash("Invalid member ID.", "error")
        return redirect(url_for('list_members'))

    member = database.users.find_one({"_id": u_id})
    if not member:
        flash("Team member not found.", "error")
        return redirect(url_for('list_members'))

    # Retrieve projects this member belongs to
    projects_pipeline = [
        {"$match": {"user_id": u_id}},
        {
            "$lookup": {
                "from": "projects",
                "localField": "project_id",
                "foreignField": "_id",
                "as": "project"
            }
        },
        {"$unwind": "$project"},
        {
            "$project": {
                "project_id": "$project._id",
                "project_name": "$project.project_name",
                "status": "$project.status",
                "deadline": "$project.deadline",
                "assigned_at": "$assigned_at"
            }
        }
    ]
    projects = list(database.project_members.aggregate(projects_pipeline))

    # Retrieve tasks assigned to this member with project name
    tasks_pipeline = [
        {"$match": {"assigned_to": u_id}},
        {
            "$lookup": {
                "from": "projects",
                "localField": "project_id",
                "foreignField": "_id",
                "as": "project"
            }
        },
        {
            "$project": {
                "title": 1,
                "status": 1,
                "priority": 1,
                "deadline": 1,
                "start_date": 1,
                "completion_date": 1,
                "project_id": 1,
                "project_name": {"$arrayElemAt": ["$project.project_name", 0]}
            }
        },
        {"$sort": {"deadline": 1}}
    ]
    tasks = list(database.tasks.aggregate(tasks_pipeline))

    today_str = date.today().strftime("%Y-%m-%d")
    completed_tasks = [t for t in tasks if t.get("status") == "Completed"]
    pending_tasks = [t for t in tasks if t.get("status") != "Completed"]
    overdue_tasks = [t for t in pending_tasks if t.get("deadline", "") < today_str]

    # Retrieve contribution history
    contribs_pipeline = [
        {"$match": {"user_id": u_id}},
        {
            "$lookup": {
                "from": "projects",
                "localField": "project_id",
                "foreignField": "_id",
                "as": "proj"
            }
        },
        {
            "$lookup": {
                "from": "tasks",
                "localField": "task_id",
                "foreignField": "_id",
                "as": "task"
            }
        },
        {
            "$project": {
                "description": 1,
                "hours_spent": 1,
                "contribution_date": 1,
                "project_name": {"$arrayElemAt": ["$proj.project_name", 0]},
                "task_title": {"$arrayElemAt": ["$task.title", 0]}
            }
        },
        {"$sort": {"contribution_date": -1}}
    ]
    contributions = list(database.contributions.aggregate(contribs_pipeline))
    total_hours = sum(c.get("hours_spent", 0) for c in contributions)

    return render_template('member_details.html',
                           member=member,
                           projects=projects,
                           tasks=tasks,
                           completed_tasks=completed_tasks,
                           pending_tasks=pending_tasks,
                           overdue_tasks=overdue_tasks,
                           contributions=contributions,
                           total_hours=round(total_hours, 1))


@app.route('/members/<member_id>/edit', methods=['GET', 'POST'])
def edit_member(member_id):
    database = get_db()
    u_id = parse_object_id(member_id)
    if not database or not u_id:
        flash("Invalid member ID.", "error")
        return redirect(url_for('list_members'))

    member = database.users.find_one({"_id": u_id})
    if not member:
        flash("Member not found.", "error")
        return redirect(url_for('list_members'))

    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip().lower()
        role = request.form.get('role', '').strip()
        skills_raw = request.form.get('skills', '').strip()

        if not name or not email or not role:
            flash("All fields are required.", "error")
            return render_template('member_form.html', member=member)

        # Duplicate email check for OTHER members
        existing = database.users.find_one({"email": email, "_id": {"$ne": u_id}})
        if existing:
            flash(f"Email '{email}' is used by another member.", "error")
            return render_template('member_form.html', member=member)

        skills_array = [s.strip() for s in skills_raw.split(',') if s.strip()]

        database.users.update_one(
            {"_id": u_id},
            {"$set": {
                "name": name,
                "email": email,
                "role": role,
                "skills": skills_array
            }}
        )

        log_activity("MEMBER_UPDATED", f"Updated profile for '{name}'", user_id=u_id)
        flash("Profile updated successfully.", "success")
        return redirect(url_for('member_details', member_id=str(u_id)))

    return render_template('member_form.html', member=member)


@app.route('/members/<member_id>/delete', methods=['POST'])
def delete_member(member_id):
    database = get_db()
    u_id = parse_object_id(member_id)
    if not database or not u_id:
        flash("Invalid member ID.", "error")
        return redirect(url_for('list_members'))

    member = database.users.find_one({"_id": u_id})
    if not member:
        flash("Member not found.", "error")
        return redirect(url_for('list_members'))

    # Prevent deleting if lead of any project
    lead_projects = database.projects.count_documents({"project_lead": u_id})
    if lead_projects > 0:
        flash(f"Cannot delete member: They are lead of {lead_projects} project(s). Reassign project lead first.", "error")
        return redirect(url_for('member_details', member_id=str(u_id)))

    # Prevent deleting if active tasks assigned
    active_tasks = database.tasks.count_documents({"assigned_to": u_id, "status": {"$ne": "Completed"}})
    if active_tasks > 0:
        flash(f"Cannot delete member: They have {active_tasks} pending task(s). Reassign them first.", "error")
        return redirect(url_for('member_details', member_id=str(u_id)))

    # Safe deletion
    database.project_members.delete_many({"user_id": u_id})
    database.projects.update_many({}, {"$pull": {"member_ids": u_id}})
    database.users.delete_one({"_id": u_id})

    log_activity("MEMBER_DELETED", f"Deleted team member '{member.get('name')}'")
    flash(f"Member '{member.get('name')}' removed.", "success")
    return redirect(url_for('list_members'))


# ==============================================================================
# 5. TASK MANAGEMENT MODULE
# ==============================================================================
@app.route('/tasks')
def list_tasks():
    database = get_db()
    if database is None:
        return render_template('error.html', error_title="Database Offline",
                               error_message="Cannot connect to MongoDB.", show_db_help=True)

    project_filter = request.args.get('project_id', '').strip()
    member_filter = request.args.get('member_id', '').strip()
    status_filter = request.args.get('status', '').strip()
    priority_filter = request.args.get('priority', '').strip()
    overdue_only = request.args.get('overdue', '').strip().lower() == 'true'

    today_str = date.today().strftime("%Y-%m-%d")

    match_stage = {}
    if project_filter:
        p_oid = parse_object_id(project_filter)
        if p_oid:
            match_stage["project_id"] = p_oid
    if member_filter:
        m_oid = parse_object_id(member_filter)
        if m_oid:
            match_stage["assigned_to"] = m_oid
    if status_filter:
        match_stage["status"] = status_filter
    if priority_filter:
        match_stage["priority"] = priority_filter
    if overdue_only:
        match_stage["status"] = {"$ne": "Completed"}
        match_stage["deadline"] = {"$lt": today_str}

    pipeline = [
        {"$match": match_stage} if match_stage else {"$match": {}},
        {
            "$lookup": {
                "from": "projects",
                "localField": "project_id",
                "foreignField": "_id",
                "as": "project"
            }
        },
        {
            "$lookup": {
                "from": "users",
                "localField": "assigned_to",
                "foreignField": "_id",
                "as": "assignee"
            }
        },
        {
            "$project": {
                "title": 1,
                "description": 1,
                "priority": 1,
                "status": 1,
                "start_date": 1,
                "deadline": 1,
                "completion_date": 1,
                "project_id": 1,
                "assigned_to": 1,
                "project_name": {"$arrayElemAt": ["$project.project_name", 0]},
                "assignee_name": {"$arrayElemAt": ["$assignee.name", 0]}
            }
        },
        {"$sort": {"deadline": 1}}
    ]

    tasks = list(database.tasks.aggregate(pipeline))

    for t in tasks:
        t["is_overdue"] = t.get("status") != "Completed" and t.get("deadline", "") < today_str

    projects = list(database.projects.find({}, {"project_name": 1}).sort("project_name", ASCENDING))
    members = list(database.users.find({}, {"name": 1}).sort("name", ASCENDING))

    return render_template('tasks.html',
                           tasks=tasks,
                           projects=projects,
                           members=members,
                           selected_project=project_filter,
                           selected_member=member_filter,
                           selected_status=status_filter,
                           selected_priority=priority_filter,
                           overdue_only=overdue_only)


@app.route('/tasks/create', methods=['GET', 'POST'])
def create_task():
    database = get_db()
    if database is None:
        flash("Database offline.", "error")
        return redirect(url_for('list_tasks'))

    projects = list(database.projects.find().sort("project_name", ASCENDING))
    preselected_project_id = request.args.get('project_id', '')

    if request.method == 'POST':
        title = request.form.get('title', '').strip()
        description = request.form.get('description', '').strip()
        project_id_str = request.form.get('project_id', '').strip()
        assigned_to_str = request.form.get('assigned_to', '').strip()
        priority = request.form.get('priority', 'Medium').strip()
        status = request.form.get('status', 'To Do').strip()
        start_date = request.form.get('start_date', '').strip()
        deadline = request.form.get('deadline', '').strip()

        if not title or not project_id_str or not assigned_to_str or not start_date or not deadline:
            flash("All required fields must be provided.", "error")
            return render_template('task_form.html', task=None, projects=projects, preselected_project_id=project_id_str)

        if deadline < start_date:
            flash("Deadline cannot be earlier than start date.", "error")
            return render_template('task_form.html', task=None, projects=projects, preselected_project_id=project_id_str)

        p_id = parse_object_id(project_id_str)
        u_id = parse_object_id(assigned_to_str)

        if not p_id or not database.projects.find_one({"_id": p_id}):
            flash("Selected project does not exist.", "error")
            return render_template('task_form.html', task=None, projects=projects)

        # STRICT VALIDATION: Assigned member MUST belong to the selected project!
        membership = database.project_members.find_one({"project_id": p_id, "user_id": u_id})
        if not membership:
            flash("Validation Failed: The selected assignee is NOT a member of this project.", "error")
            return render_template('task_form.html', task=None, projects=projects, preselected_project_id=project_id_str)

        now = datetime.now()
        completion_date = date.today().strftime("%Y-%m-%d") if status == "Completed" else None

        new_task = {
            "title": title,
            "description": description,
            "project_id": p_id,
            "assigned_to": u_id,
            "priority": priority,
            "start_date": start_date,
            "deadline": deadline,
            "status": status,
            "completion_date": completion_date,
            "created_at": now,
            "updated_at": now
        }

        res = database.tasks.insert_one(new_task)
        log_activity("TASK_CREATED", f"Created task '{title}' ({priority} priority)", project_id=p_id, user_id=u_id)
        flash(f"Task '{title}' created successfully!", "success")
        return redirect(url_for('list_tasks', project_id=str(p_id)))

    return render_template('task_form.html', task=None, projects=projects, preselected_project_id=preselected_project_id)


@app.route('/tasks/<task_id>/edit', methods=['GET', 'POST'])
def edit_task(task_id):
    database = get_db()
    t_id = parse_object_id(task_id)
    if not database or not t_id:
        flash("Invalid task ID.", "error")
        return redirect(url_for('list_tasks'))

    task = database.tasks.find_one({"_id": t_id})
    if not task:
        flash("Task not found.", "error")
        return redirect(url_for('list_tasks'))

    projects = list(database.projects.find().sort("project_name", ASCENDING))

    if request.method == 'POST':
        title = request.form.get('title', '').strip()
        description = request.form.get('description', '').strip()
        project_id_str = request.form.get('project_id', '').strip()
        assigned_to_str = request.form.get('assigned_to', '').strip()
        priority = request.form.get('priority', 'Medium').strip()
        new_status = request.form.get('status', 'To Do').strip()
        start_date = request.form.get('start_date', '').strip()
        deadline = request.form.get('deadline', '').strip()

        if not title or not project_id_str or not assigned_to_str or not start_date or not deadline:
            flash("Required fields missing.", "error")
            return render_template('task_form.html', task=task, projects=projects)

        if deadline < start_date:
            flash("Deadline cannot be earlier than start date.", "error")
            return render_template('task_form.html', task=task, projects=projects)

        p_id = parse_object_id(project_id_str)
        u_id = parse_object_id(assigned_to_str)

        membership = database.project_members.find_one({"project_id": p_id, "user_id": u_id})
        if not membership:
            flash("Assignee must be an active member of the selected project.", "error")
            return render_template('task_form.html', task=task, projects=projects)

        # Automatic completion_date rules:
        # If changed to Completed -> set completion_date
        # If reopened -> clear completion_date
        old_status = task.get("status")
        completion_date = task.get("completion_date")

        if new_status == "Completed" and old_status != "Completed":
            completion_date = date.today().strftime("%Y-%m-%d")
        elif new_status != "Completed":
            completion_date = None

        database.tasks.update_one(
            {"_id": t_id},
            {"$set": {
                "title": title,
                "description": description,
                "project_id": p_id,
                "assigned_to": u_id,
                "priority": priority,
                "start_date": start_date,
                "deadline": deadline,
                "status": new_status,
                "completion_date": completion_date,
                "updated_at": datetime.now()
            }}
        )

        log_activity("TASK_UPDATED", f"Updated task '{title}' (Status: {new_status})", project_id=p_id, user_id=u_id)
        flash(f"Task '{title}' updated successfully.", "success")
        return redirect(url_for('list_tasks', project_id=str(p_id)))

    return render_template('task_form.html', task=task, projects=projects)


@app.route('/tasks/<task_id>/quick-status', methods=['POST'])
def quick_status_task(task_id):
    """Quick inline button to cycle or set status (To Do -> In Progress -> Completed)."""
    database = get_db()
    t_id = parse_object_id(task_id)
    if not database or not t_id:
        return jsonify({"success": False, "error": "Invalid ID"}), 400

    new_status = request.form.get('status', '').strip()
    if new_status not in ["To Do", "In Progress", "Completed"]:
        return jsonify({"success": False, "error": "Invalid status"}), 400

    completion_date = date.today().strftime("%Y-%m-%d") if new_status == "Completed" else None

    database.tasks.update_one(
        {"_id": t_id},
        {"$set": {
            "status": new_status,
            "completion_date": completion_date,
            "updated_at": datetime.now()
        }}
    )

    task = database.tasks.find_one({"_id": t_id})
    log_activity("TASK_STATUS_CHANGED", f"Changed status of '{task.get('title')}' to '{new_status}'",
                 project_id=task.get("project_id"), user_id=task.get("assigned_to"))

    flash(f"Task '{task.get('title')}' updated to {new_status}.", "success")
    return redirect(request.referrer or url_for('list_tasks'))


@app.route('/tasks/<task_id>/delete', methods=['POST'])
def delete_task(task_id):
    database = get_db()
    t_id = parse_object_id(task_id)
    if not database or not t_id:
        flash("Invalid task ID.", "error")
        return redirect(url_for('list_tasks'))

    task = database.tasks.find_one({"_id": t_id})
    if not task:
        flash("Task not found.", "error")
        return redirect(url_for('list_tasks'))

    # Cascade: delete contributions linked to this task
    contrib_del = database.contributions.delete_many({"task_id": t_id})
    database.tasks.delete_one({"_id": t_id})

    log_activity("TASK_DELETED", f"Deleted task '{task.get('title')}' and {contrib_del.deleted_count} linked contribution records.")
    flash(f"Task '{task.get('title')}' deleted.", "success")
    return redirect(request.referrer or url_for('list_tasks'))


# ==============================================================================
# 6. CONTRIBUTION TRACKING MODULE
# ==============================================================================
@app.route('/contributions')
def list_contributions():
    database = get_db()
    if database is None:
        return render_template('error.html', error_title="Database Offline",
                               error_message="Cannot connect to MongoDB.", show_db_help=True)

    member_filter = request.args.get('member_id', '').strip()
    project_filter = request.args.get('project_id', '').strip()

    match_stage = {}
    if member_filter:
        m_oid = parse_object_id(member_filter)
        if m_oid:
            match_stage["user_id"] = m_oid
    if project_filter:
        p_oid = parse_object_id(project_filter)
        if p_oid:
            match_stage["project_id"] = p_oid

    pipeline = [
        {"$match": match_stage} if match_stage else {"$match": {}},
        {
            "$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "_id",
                "as": "user"
            }
        },
        {
            "$lookup": {
                "from": "projects",
                "localField": "project_id",
                "foreignField": "_id",
                "as": "project"
            }
        },
        {
            "$lookup": {
                "from": "tasks",
                "localField": "task_id",
                "foreignField": "_id",
                "as": "task"
            }
        },
        {
            "$project": {
                "description": 1,
                "hours_spent": 1,
                "contribution_date": 1,
                "created_at": 1,
                "user_id": 1,
                "project_id": 1,
                "task_id": 1,
                "user_name": {"$arrayElemAt": ["$user.name", 0]},
                "project_name": {"$arrayElemAt": ["$project.project_name", 0]},
                "task_title": {"$arrayElemAt": ["$task.title", 0]}
            }
        },
        {"$sort": {"contribution_date": -1, "created_at": -1}}
    ]

    contributions = list(database.contributions.aggregate(pipeline))

    # Summary analytics: Total hours per member
    hours_by_member = list(database.contributions.aggregate([
        {"$group": {"_id": "$user_id", "total_hours": {"$sum": "$hours_spent"}}},
        {
            "$lookup": {
                "from": "users",
                "localField": "_id",
                "foreignField": "_id",
                "as": "user"
            }
        },
        {"$project": {"name": {"$arrayElemAt": ["$user.name", 0]}, "total_hours": 1}},
        {"$sort": {"total_hours": -1}}
    ]))

    # Summary analytics: Total hours per project
    hours_by_project = list(database.contributions.aggregate([
        {"$group": {"_id": "$project_id", "total_hours": {"$sum": "$hours_spent"}}},
        {
            "$lookup": {
                "from": "projects",
                "localField": "_id",
                "foreignField": "_id",
                "as": "proj"
            }
        },
        {"$project": {"project_name": {"$arrayElemAt": ["$proj.project_name", 0]}, "total_hours": 1}},
        {"$sort": {"total_hours": -1}}
    ]))

    members = list(database.users.find().sort("name", ASCENDING))
    projects = list(database.projects.find().sort("project_name", ASCENDING))

    total_hours_sum = sum(c.get("hours_spent", 0) for c in contributions)

    return render_template('contributions.html',
                           contributions=contributions,
                           hours_by_member=hours_by_member,
                           hours_by_project=hours_by_project,
                           members=members,
                           projects=projects,
                           selected_member=member_filter,
                           selected_project=project_filter,
                           total_hours_sum=round(total_hours_sum, 1))


@app.route('/contributions/create', methods=['GET', 'POST'])
def create_contribution():
    database = get_db()
    if database is None:
        flash("Database offline.", "error")
        return redirect(url_for('list_contributions'))

    users = list(database.users.find().sort("name", ASCENDING))
    projects = list(database.projects.find().sort("project_name", ASCENDING))

    if request.method == 'POST':
        user_id_str = request.form.get('user_id', '').strip()
        project_id_str = request.form.get('project_id', '').strip()
        task_id_str = request.form.get('task_id', '').strip()
        description = request.form.get('description', '').strip()
        contrib_date = request.form.get('contribution_date', '').strip()
        hours_str = request.form.get('hours_spent', '').strip()

        if not user_id_str or not project_id_str or not task_id_str or not description or not contrib_date or not hours_str:
            flash("All contribution fields are mandatory.", "error")
            return render_template('contribution_form.html', contrib=None, users=users, projects=projects)

        try:
            hours = float(hours_str)
            if hours <= 0:
                raise ValueError()
        except ValueError:
            flash("Hours spent must be a positive number greater than 0.", "error")
            return render_template('contribution_form.html', contrib=None, users=users, projects=projects)

        u_id = parse_object_id(user_id_str)
        p_id = parse_object_id(project_id_str)
        t_id = parse_object_id(task_id_str)

        # STRICT VALIDATION 1: Member belongs to selected project
        membership = database.project_members.find_one({"project_id": p_id, "user_id": u_id})
        if not membership:
            flash("Validation Failed: The member is not assigned to the selected project.", "error")
            return render_template('contribution_form.html', contrib=None, users=users, projects=projects)

        # STRICT VALIDATION 2 & 3: Task belongs to selected project AND is assigned to that member
        task = database.tasks.find_one({"_id": t_id, "project_id": p_id, "assigned_to": u_id})
        if not task:
            flash("Validation Failed: Selected task does not belong to this project or is not assigned to this member.", "error")
            return render_template('contribution_form.html', contrib=None, users=users, projects=projects)

        new_contrib = {
            "user_id": u_id,
            "project_id": p_id,
            "task_id": t_id,
            "description": description,
            "contribution_date": contrib_date,
            "hours_spent": hours,
            "created_at": datetime.now()
        }

        database.contributions.insert_one(new_contrib)
        user = database.users.find_one({"_id": u_id})
        log_activity("CONTRIBUTION_RECORDED", f"Recorded {hours} hrs by {user.get('name')} on '{task.get('title')}'", project_id=p_id, user_id=u_id)

        flash(f"Logged {hours} hours contribution successfully!", "success")
        return redirect(url_for('list_contributions'))

    return render_template('contribution_form.html', contrib=None, users=users, projects=projects)


@app.route('/contributions/<contrib_id>/edit', methods=['GET', 'POST'])
def edit_contribution(contrib_id):
    database = get_db()
    c_id = parse_object_id(contrib_id)
    if not database or not c_id:
        flash("Invalid contribution ID.", "error")
        return redirect(url_for('list_contributions'))

    contrib = database.contributions.find_one({"_id": c_id})
    if not contrib:
        flash("Contribution record not found.", "error")
        return redirect(url_for('list_contributions'))

    users = list(database.users.find().sort("name", ASCENDING))
    projects = list(database.projects.find().sort("project_name", ASCENDING))

    if request.method == 'POST':
        description = request.form.get('description', '').strip()
        contrib_date = request.form.get('contribution_date', '').strip()
        hours_str = request.form.get('hours_spent', '').strip()

        try:
            hours = float(hours_str)
            if hours <= 0:
                raise ValueError()
        except ValueError:
            flash("Hours must be a positive decimal number.", "error")
            return render_template('contribution_form.html', contrib=contrib, users=users, projects=projects)

        database.contributions.update_one(
            {"_id": c_id},
            {"$set": {
                "description": description,
                "contribution_date": contrib_date,
                "hours_spent": hours
            }}
        )

        log_activity("CONTRIBUTION_UPDATED", f"Updated contribution to {hours} hours",
                     project_id=contrib.get("project_id"), user_id=contrib.get("user_id"))
        flash("Contribution record updated.", "success")
        return redirect(url_for('list_contributions'))

    return render_template('contribution_form.html', contrib=contrib, users=users, projects=projects)


@app.route('/contributions/<contrib_id>/delete', methods=['POST'])
def delete_contribution(contrib_id):
    database = get_db()
    c_id = parse_object_id(contrib_id)
    if not database or not c_id:
        flash("Invalid ID.", "error")
        return redirect(url_for('list_contributions'))

    contrib = database.contributions.find_one({"_id": c_id})
    if contrib:
        database.contributions.delete_one({"_id": c_id})
        log_activity("CONTRIBUTION_DELETED", f"Deleted {contrib.get('hours_spent')} hours contribution record",
                     project_id=contrib.get("project_id"), user_id=contrib.get("user_id"))
        flash("Contribution record deleted.", "success")

    return redirect(url_for('list_contributions'))


# ==============================================================================
# 7. REPORTS & MONGODB ANALYTICS MODULE (8 Aggregation Pipelines)
# ==============================================================================
@app.route('/reports')
def reports():
    database = get_db()
    if database is None:
        return render_template('error.html', error_title="Database Offline",
                               error_message="Cannot connect to MongoDB.", show_db_help=True)

    today_str = date.today().strftime("%Y-%m-%d")
    seven_days_later = (date.today() + timedelta(days=7)).strftime("%Y-%m-%d")

    # REPORT 1: Task completion percentage by project
    r1_pipeline = [
        {
            "$lookup": {
                "from": "tasks",
                "localField": "_id",
                "foreignField": "project_id",
                "as": "tasks"
            }
        },
        {
            "$project": {
                "project_name": 1,
                "status": 1,
                "total_tasks": {"$size": "$tasks"},
                "completed_tasks": {
                    "$size": {
                        "$filter": {
                            "input": "$tasks",
                            "as": "t",
                            "cond": {"$eq": ["$$t.status", "Completed"]}
                        }
                    }
                }
            }
        },
        {
            "$project": {
                "project_name": 1,
                "status": 1,
                "total_tasks": 1,
                "completed_tasks": 1,
                "completion_pct": {
                    "$cond": {
                        "if": {"$gt": ["$total_tasks", 0]},
                        "then": {"$multiply": [{"$divide": ["$completed_tasks", "$total_tasks"]}, 100]},
                        "else": 0
                    }
                }
            }
        },
        {"$sort": {"completion_pct": -1}}
    ]
    report1 = list(database.projects.aggregate(r1_pipeline))
    for r in report1:
        r["completion_pct"] = round(r["completion_pct"], 1)

    # REPORT 2: Completed and pending tasks by team member
    r2_pipeline = [
        {
            "$lookup": {
                "from": "tasks",
                "localField": "_id",
                "foreignField": "assigned_to",
                "as": "tasks"
            }
        },
        {
            "$project": {
                "name": 1,
                "role": 1,
                "email": 1,
                "total_tasks": {"$size": "$tasks"},
                "completed_tasks": {
                    "$size": {
                        "$filter": {
                            "input": "$tasks",
                            "as": "t",
                            "cond": {"$eq": ["$$t.status", "Completed"]}
                        }
                    }
                },
                "pending_tasks": {
                    "$size": {
                        "$filter": {
                            "input": "$tasks",
                            "as": "t",
                            "cond": {"$ne": ["$$t.status", "Completed"]}
                        }
                    }
                }
            }
        },
        {"$sort": {"total_tasks": -1}}
    ]
    report2 = list(database.users.aggregate(r2_pipeline))

    # REPORT 3: Overdue tasks with project and member details
    r3_pipeline = [
        {
            "$match": {
                "status": {"$ne": "Completed"},
                "deadline": {"$lt": today_str}
            }
        },
        {
            "$lookup": {
                "from": "projects",
                "localField": "project_id",
                "foreignField": "_id",
                "as": "project"
            }
        },
        {
            "$lookup": {
                "from": "users",
                "localField": "assigned_to",
                "foreignField": "_id",
                "as": "member"
            }
        },
        {
            "$project": {
                "title": 1,
                "deadline": 1,
                "priority": 1,
                "status": 1,
                "project_name": {"$arrayElemAt": ["$project.project_name", 0]},
                "member_name": {"$arrayElemAt": ["$member.name", 0]}
            }
        },
        {"$sort": {"deadline": 1}}
    ]
    report3 = list(database.tasks.aggregate(r3_pipeline))

    # REPORT 4: Workload distribution among team members (active tasks count)
    r4_pipeline = [
        {"$match": {"status": {"$ne": "Completed"}}},
        {
            "$group": {
                "_id": "$assigned_to",
                "active_task_count": {"$sum": 1}
            }
        },
        {
            "$lookup": {
                "from": "users",
                "localField": "_id",
                "foreignField": "_id",
                "as": "user"
            }
        },
        {
            "$project": {
                "member_name": {"$arrayElemAt": ["$user.name", 0]},
                "role": {"$arrayElemAt": ["$user.role", 0]},
                "active_task_count": 1
            }
        },
        {"$sort": {"active_task_count": -1}}
    ]
    report4 = list(database.tasks.aggregate(r4_pipeline))

    # REPORT 5: Total contribution hours per member
    r5_pipeline = [
        {
            "$group": {
                "_id": "$user_id",
                "total_hours": {"$sum": "$hours_spent"},
                "entries_count": {"$sum": 1}
            }
        },
        {
            "$lookup": {
                "from": "users",
                "localField": "_id",
                "foreignField": "_id",
                "as": "user"
            }
        },
        {
            "$project": {
                "member_name": {"$arrayElemAt": ["$user.name", 0]},
                "role": {"$arrayElemAt": ["$user.role", 0]},
                "total_hours": 1,
                "entries_count": 1
            }
        },
        {"$sort": {"total_hours": -1}}
    ]
    report5 = list(database.contributions.aggregate(r5_pipeline))
    for r in report5:
        r["total_hours"] = round(r["total_hours"], 1)

    # REPORT 6: Project deadline and progress summary
    r6_pipeline = [
        {
            "$lookup": {
                "from": "tasks",
                "localField": "_id",
                "foreignField": "project_id",
                "as": "tasks"
            }
        },
        {
            "$project": {
                "project_name": 1,
                "status": 1,
                "start_date": 1,
                "deadline": 1,
                "total_tasks": {"$size": "$tasks"},
                "completed_tasks": {
                    "$size": {
                        "$filter": {
                            "input": "$tasks",
                            "as": "t",
                            "cond": {"$eq": ["$$t.status", "Completed"]}
                        }
                    }
                }
            }
        },
        {"$sort": {"deadline": 1}}
    ]
    report6 = list(database.projects.aggregate(r6_pipeline))
    for r in report6:
        tot = r.get("total_tasks", 0)
        cmp_cnt = r.get("completed_tasks", 0)
        r["progress"] = round((cmp_cnt / tot * 100), 1) if tot > 0 else 0
        r["is_overdue"] = r.get("deadline", "") < today_str and r.get("status") != "Completed"

    # REPORT 7: Team members with no assigned tasks
    r7_pipeline = [
        {
            "$lookup": {
                "from": "tasks",
                "localField": "_id",
                "foreignField": "assigned_to",
                "as": "tasks"
            }
        },
        {
            "$match": {
                "tasks": {"$size": 0}
            }
        },
        {
            "$project": {
                "name": 1,
                "email": 1,
                "role": 1,
                "skills": 1
            }
        },
        {"$sort": {"name": 1}}
    ]
    report7 = list(database.users.aggregate(r7_pipeline))

    # REPORT 8: Projects with tasks approaching deadlines (due between today and today + 7 days)
    r8_pipeline = [
        {
            "$match": {
                "status": {"$ne": "Completed"},
                "deadline": {"$gte": today_str, "$lte": seven_days_later}
            }
        },
        {
            "$lookup": {
                "from": "projects",
                "localField": "project_id",
                "foreignField": "_id",
                "as": "project"
            }
        },
        {
            "$lookup": {
                "from": "users",
                "localField": "assigned_to",
                "foreignField": "_id",
                "as": "user"
            }
        },
        {
            "$project": {
                "title": 1,
                "deadline": 1,
                "priority": 1,
                "status": 1,
                "project_name": {"$arrayElemAt": ["$project.project_name", 0]},
                "member_name": {"$arrayElemAt": ["$user.name", 0]}
            }
        },
        {"$sort": {"deadline": 1}}
    ]
    report8 = list(database.tasks.aggregate(r8_pipeline))

    return render_template('reports.html',
                           report1=report1,
                           report2=report2,
                           report3=report3,
                           report4=report4,
                           report5=report5,
                           report6=report6,
                           report7=report7,
                           report8=report8,
                           today_str=today_str,
                           seven_days_later=seven_days_later)


# ==============================================================================
# 8. ACTIVITY HISTORY MODULE
# ==============================================================================
@app.route('/activity')
def activity_history():
    database = get_db()
    if database is None:
        return render_template('error.html', error_title="Database Offline",
                               error_message="Cannot connect to MongoDB.", show_db_help=True)

    action_filter = request.args.get('action_type', '').strip()
    project_filter = request.args.get('project_id', '').strip()

    match_stage = {}
    if action_filter:
        match_stage["action_type"] = action_filter
    if project_filter:
        p_oid = parse_object_id(project_filter)
        if p_oid:
            match_stage["project_id"] = p_oid

    pipeline = [
        {"$match": match_stage} if match_stage else {"$match": {}},
        {
            "$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "_id",
                "as": "user"
            }
        },
        {
            "$lookup": {
                "from": "projects",
                "localField": "project_id",
                "foreignField": "_id",
                "as": "project"
            }
        },
        {
            "$project": {
                "action_type": 1,
                "description": 1,
                "timestamp": 1,
                "user_name": {"$arrayElemAt": ["$user.name", 0]},
                "project_name": {"$arrayElemAt": ["$project.project_name", 0]}
            }
        },
        {"$sort": {"timestamp": -1}},
        {"$limit": 100}
    ]

    activities = list(database.activity_logs.aggregate(pipeline))
    projects = list(database.projects.find().sort("project_name", ASCENDING))

    return render_template('activity.html',
                           activities=activities,
                           projects=projects,
                           selected_action=action_filter,
                           selected_project=project_filter)


# ==============================================================================
# 9. JSON API HELPER ENDPOINTS (For Dynamic JS Cascading Dropdowns)
# ==============================================================================
@app.route('/api/project-members/<project_id>')
def api_project_members(project_id):
    """Returns members belonging to a specific project for dynamic form dropdowns."""
    database = get_db()
    p_id = parse_object_id(project_id)
    if not database or not p_id:
        return jsonify([])

    pipeline = [
        {"$match": {"project_id": p_id}},
        {
            "$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "_id",
                "as": "user"
            }
        },
        {"$unwind": "$user"},
        {
            "$project": {
                "_id": {"$toString": "$user._id"},
                "name": "$user.name",
                "role": "$user.role"
            }
        },
        {"$sort": {"name": 1}}
    ]
    members = list(database.project_members.aggregate(pipeline))
    return jsonify(members)


@app.route('/api/member-tasks/<project_id>/<user_id>')
def api_member_tasks(project_id, user_id):
    """Returns tasks belonging to a project AND assigned to a specific member."""
    database = get_db()
    p_id = parse_object_id(project_id)
    u_id = parse_object_id(user_id)
    if not database or not p_id or not u_id:
        return jsonify([])

    tasks = list(database.tasks.find(
        {"project_id": p_id, "assigned_to": u_id},
        {"_id": 1, "title": 1, "status": 1}
    ).sort("title", ASCENDING))

    result = [{"_id": str(t["_id"]), "title": t["title"], "status": t.get("status", "To Do")} for t in tasks]
    return jsonify(result)


if __name__ == '__main__':
    # When running on Windows locally: python app.py
    # Runs on localhost port 5000 or port 3000 if configured
    port = int(os.environ.get('PORT', 5000))
    print("=" * 60)
    print("MergeMate — College DBMS Mini Project")
    print(f"Server starting on: http://127.0.0.1:{port}")
    print(f"MongoDB Target: {Config.MONGO_URI} (Database: {Config.MONGO_DBNAME})")
    print("=" * 60)
    app.run(host='0.0.0.0', port=port, debug=Config.DEBUG)
