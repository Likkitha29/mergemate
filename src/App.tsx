/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderKanban,
  Users,
  CheckSquare,
  Clock,
  BarChart3,
  History,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  ChevronRight,
  Trash2,
  Edit2,
  BookOpen,
  Terminal,
  RotateCcw,
  Code2,
  X,
  UserPlus
} from 'lucide-react';

// ==============================================================================
// 1. DATA TYPES & MODELS (Mirrors MongoDB BSON Collections)
// ==============================================================================
export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  skills: string[];
  created_at: string;
}

export interface Project {
  _id: string;
  project_name: string;
  description: string;
  start_date: string;
  deadline: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold';
  project_lead: string; // ObjectId ref to users._id
  member_ids: string[]; // Array of ObjectId refs
  created_at: string;
  updated_at: string;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  project_id: string; // ObjectId ref
  assigned_to: string; // ObjectId ref
  priority: 'Low' | 'Medium' | 'High';
  start_date: string;
  deadline: string;
  status: 'To Do' | 'In Progress' | 'Completed';
  completion_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contribution {
  _id: string;
  user_id: string; // ObjectId ref
  project_id: string; // ObjectId ref
  task_id: string; // ObjectId ref
  description: string;
  contribution_date: string;
  hours_spent: number;
  created_at: string;
}

export interface ProjectMember {
  _id: string;
  project_id: string;
  user_id: string;
  assigned_at: string;
}

export interface ActivityLog {
  _id: string;
  action_type: string;
  project_id?: string | null;
  user_id?: string | null;
  description: string;
  timestamp: string;
}

// ==============================================================================
// 2. INITIAL REALISTIC SAMPLE DATA
// ==============================================================================
const todayDateStr = new Date().toISOString().split('T')[0];

const INITIAL_USERS: User[] = [
  {
    _id: "usr_101",
    name: "Aarav Patel",
    email: "aarav.patel@college.edu",
    role: "Full-Stack Developer",
    skills: ["Python", "Flask", "MongoDB", "JavaScript"],
    created_at: "2026-09-05"
  },
  {
    _id: "usr_102",
    name: "Sneha Rao",
    email: "sneha.rao@college.edu",
    role: "UI/UX Designer & Frontend Lead",
    skills: ["HTML5", "CSS3", "JavaScript", "Figma"],
    created_at: "2026-09-08"
  },
  {
    _id: "usr_103",
    name: "Rohan Sharma",
    email: "rohan.sharma@college.edu",
    role: "Backend Engineer",
    skills: ["Python", "PyMongo", "REST APIs", "SQL"],
    created_at: "2026-09-12"
  },
  {
    _id: "usr_104",
    name: "Priya Nair",
    email: "priya.nair@college.edu",
    role: "Database Architect",
    skills: ["MongoDB Aggregations", "Schema Design", "Data Modeling"],
    created_at: "2026-09-15"
  },
  {
    _id: "usr_105",
    name: "Vikram Malhotra",
    email: "vikram.m@college.edu",
    role: "QA & DevOps Tester",
    skills: ["Automated Testing", "Git", "Security Auditing"],
    created_at: "2026-09-20"
  },
  {
    _id: "usr_106",
    name: "Ananya Iyer",
    email: "ananya.iyer@college.edu",
    role: "Technical Documentation Specialist",
    skills: ["Technical Writing", "API Docs", "Research"],
    created_at: "2026-09-25"
  }
];

const INITIAL_PROJECTS: Project[] = [
  {
    _id: "prj_201",
    project_name: "MergeMate Core Platform",
    description: "Collaborative DBMS mini-project tracking system with MongoDB aggregation analytics and hours tracking.",
    start_date: "2026-10-01",
    deadline: "2026-11-28",
    status: "In Progress",
    project_lead: "usr_101",
    member_ids: ["usr_101", "usr_102", "usr_103", "usr_104"],
    created_at: "2026-10-01",
    updated_at: "2026-10-25"
  },
  {
    _id: "prj_202",
    project_name: "Smart Campus Transit System",
    description: "Real-time college bus route tracking and schedule notification portal for campus students.",
    start_date: "2026-09-20",
    deadline: "2026-11-12",
    status: "In Progress",
    project_lead: "usr_102",
    member_ids: ["usr_102", "usr_103", "usr_105"],
    created_at: "2026-09-20",
    updated_at: "2026-10-20"
  },
  {
    _id: "prj_203",
    project_name: "EcoTrack Carbon Footprint Dashboard",
    description: "College environmental sustainability tracker measuring dormitory energy usage and paper recycling metrics.",
    start_date: "2026-09-10",
    deadline: "2026-11-02", // Past deadline for realistic overdue testing
    status: "In Progress",
    project_lead: "usr_104",
    member_ids: ["usr_104", "usr_105", "usr_106"],
    created_at: "2026-09-10",
    updated_at: "2026-10-18"
  }
];

const INITIAL_PROJECT_MEMBERS: ProjectMember[] = [
  { _id: "pm_01", project_id: "prj_201", user_id: "usr_101", assigned_at: "2026-10-01" },
  { _id: "pm_02", project_id: "prj_201", user_id: "usr_102", assigned_at: "2026-10-01" },
  { _id: "pm_03", project_id: "prj_201", user_id: "usr_103", assigned_at: "2026-10-02" },
  { _id: "pm_04", project_id: "prj_201", user_id: "usr_104", assigned_at: "2026-10-02" },

  { _id: "pm_05", project_id: "prj_202", user_id: "usr_102", assigned_at: "2026-09-20" },
  { _id: "pm_06", project_id: "prj_202", user_id: "usr_103", assigned_at: "2026-09-21" },
  { _id: "pm_07", project_id: "prj_202", user_id: "usr_105", assigned_at: "2026-09-22" },

  { _id: "pm_08", project_id: "prj_203", user_id: "usr_104", assigned_at: "2026-09-10" },
  { _id: "pm_09", project_id: "prj_203", user_id: "usr_105", assigned_at: "2026-09-11" },
  { _id: "pm_10", project_id: "prj_203", user_id: "usr_106", assigned_at: "2026-09-12" }
];

const INITIAL_TASKS: Task[] = [
  // Project 1
  {
    _id: "tsk_301",
    title: "Design MongoDB Aggregation Pipelines",
    description: "Construct $lookup, $group, and $cond pipelines for student workload and contribution reports.",
    project_id: "prj_201",
    assigned_to: "usr_104",
    priority: "High",
    start_date: "2026-10-05",
    deadline: "2026-10-18",
    status: "Completed",
    completion_date: "2026-10-17",
    created_at: "2026-10-05",
    updated_at: "2026-10-17"
  },
  {
    _id: "tsk_302",
    title: "Develop Flask REST Routes & Templates",
    description: "Implement CRUD controllers for projects, members, tasks, and contributions with error handling.",
    project_id: "prj_201",
    assigned_to: "usr_101",
    priority: "High",
    start_date: "2026-10-10",
    deadline: "2026-11-15",
    status: "In Progress",
    completion_date: null,
    created_at: "2026-10-10",
    updated_at: "2026-10-25"
  },
  {
    _id: "tsk_303",
    title: "Build Responsive CSS Layout & Sidebar",
    description: "Create professional SaaS dashboard layout with light theme, responsive table grids and modals.",
    project_id: "prj_201",
    assigned_to: "usr_102",
    priority: "Medium",
    start_date: "2026-10-12",
    deadline: "2026-10-22",
    status: "Completed",
    completion_date: "2026-10-22",
    created_at: "2026-10-12",
    updated_at: "2026-10-22"
  },
  {
    _id: "tsk_304",
    title: "Implement PyMongo Index Scripts",
    description: "Define compound unique index on project_members and single-field search indexes.",
    project_id: "prj_201",
    assigned_to: "usr_103",
    priority: "Medium",
    start_date: "2026-10-15",
    deadline: "2026-10-24",
    status: "Completed",
    completion_date: "2026-10-23",
    created_at: "2026-10-15",
    updated_at: "2026-10-23"
  },
  {
    _id: "tsk_305",
    title: "Dynamic Member and Task Filter UI",
    description: "Vanilla JavaScript event listeners for dynamic member filtering by project on task/contribution forms.",
    project_id: "prj_201",
    assigned_to: "usr_102",
    priority: "Low",
    start_date: "2026-10-20",
    deadline: "2026-11-10",
    status: "In Progress",
    completion_date: null,
    created_at: "2026-10-20",
    updated_at: "2026-10-28"
  },
  {
    _id: "tsk_306",
    title: "Comprehensive Unit & Integration Testing",
    description: "Verify edge cases including duplicate email rejection, invalid ObjectId, and cascade protection.",
    project_id: "prj_201",
    assigned_to: "usr_101",
    priority: "High",
    start_date: "2026-11-01",
    deadline: "2026-11-25",
    status: "To Do",
    completion_date: null,
    created_at: "2026-10-25",
    updated_at: "2026-10-25"
  },

  // Project 2
  {
    _id: "tsk_307",
    title: "Design GPS Route Geofencing Schema",
    description: "Document specifications for bus stop coordinates and scheduled arrival delays.",
    project_id: "prj_202",
    assigned_to: "usr_103",
    priority: "High",
    start_date: "2026-09-25",
    deadline: "2026-10-10",
    status: "Completed",
    completion_date: "2026-10-09",
    created_at: "2026-09-25",
    updated_at: "2026-10-09"
  },
  {
    _id: "tsk_308",
    title: "Campus Route Mobile Responsive Map View",
    description: "Mobile-optimized SVG schedule table and station checklist for students.",
    project_id: "prj_202",
    assigned_to: "usr_102",
    priority: "Medium",
    start_date: "2026-10-15",
    deadline: "2026-11-09",
    status: "In Progress",
    completion_date: null,
    created_at: "2026-10-15",
    updated_at: "2026-10-25"
  },
  {
    _id: "tsk_309",
    title: "Load Testing for Peak Campus Rush Hours",
    description: "Simulate 500 concurrent student queries during 8:30 AM college rush hour.",
    project_id: "prj_202",
    assigned_to: "usr_105",
    priority: "High",
    start_date: "2026-10-10",
    deadline: "2026-11-01", // Overdue!
    status: "In Progress",
    completion_date: null,
    created_at: "2026-10-10",
    updated_at: "2026-10-25"
  },
  {
    _id: "tsk_310",
    title: "SMS Gateway Integration for Emergency Delays",
    description: "Send broadcast alerts when rain or mechanical breakdown delays bus routes.",
    project_id: "prj_202",
    assigned_to: "usr_103",
    priority: "Low",
    start_date: "2026-11-02",
    deadline: "2026-11-18",
    status: "To Do",
    completion_date: null,
    created_at: "2026-10-20",
    updated_at: "2026-10-20"
  },

  // Project 3
  {
    _id: "tsk_311",
    title: "Dormitory Electricity Meter Data Importer",
    description: "Parse hourly kilowatt-hour CSV logs from hostel smart meters into MongoDB documents.",
    project_id: "prj_203",
    assigned_to: "usr_104",
    priority: "High",
    start_date: "2026-09-15",
    deadline: "2026-10-05",
    status: "Completed",
    completion_date: "2026-10-04",
    created_at: "2026-09-15",
    updated_at: "2026-10-04"
  },
  {
    _id: "tsk_312",
    title: "Carbon Reduction Milestone Aggregations",
    description: "Compute weekly savings comparisons against college semester targets using MongoDB $group.",
    project_id: "prj_203",
    assigned_to: "usr_104",
    priority: "Medium",
    start_date: "2026-10-10",
    deadline: "2026-11-01", // Overdue!
    status: "To Do",
    completion_date: null,
    created_at: "2026-10-10",
    updated_at: "2026-10-10"
  },
  {
    _id: "tsk_313",
    title: "Environmental Audit Report Generation",
    description: "Draft executive PDF summary for Dean of Student Affairs detailing recycling metrics.",
    project_id: "prj_203",
    assigned_to: "usr_106",
    priority: "Low",
    start_date: "2026-10-15",
    deadline: "2026-11-10",
    status: "In Progress",
    completion_date: null,
    created_at: "2026-10-15",
    updated_at: "2026-10-26"
  },
  {
    _id: "tsk_314",
    title: "Security Review of Sensor Data Ingestion",
    description: "Verify that API endpoints reject unauthenticated packet injection from campus Wi-Fi.",
    project_id: "prj_203",
    assigned_to: "usr_105",
    priority: "High",
    start_date: "2026-10-18",
    deadline: "2026-11-03", // Overdue!
    status: "In Progress",
    completion_date: null,
    created_at: "2026-10-18",
    updated_at: "2026-10-28"
  }
];

const INITIAL_CONTRIBUTIONS: Contribution[] = [
  {
    _id: "cnt_401",
    user_id: "usr_104",
    project_id: "prj_201",
    task_id: "tsk_301",
    description: "Formulated $lookup stages joining project_members and tasks; benchmarked index execution speed.",
    contribution_date: "2026-10-16",
    hours_spent: 8.5,
    created_at: "2026-10-16"
  },
  {
    _id: "cnt_402",
    user_id: "usr_102",
    project_id: "prj_201",
    task_id: "tsk_303",
    description: "Built clean Tailwind-inspired CSS styling, collapsible sidebar, and accessible modal views.",
    contribution_date: "2026-10-21",
    hours_spent: 6.0,
    created_at: "2026-10-21"
  },
  {
    _id: "cnt_403",
    user_id: "usr_103",
    project_id: "prj_201",
    task_id: "tsk_304",
    description: "Wrote automated index scripts verifying uniqueness on emails and compound membership pairs.",
    contribution_date: "2026-10-23",
    hours_spent: 4.5,
    created_at: "2026-10-23"
  },
  {
    _id: "cnt_404",
    user_id: "usr_101",
    project_id: "prj_201",
    task_id: "tsk_302",
    description: "Coded core Flask routes, Jinja templates, ObjectId parameter validation, and flash feedback messages.",
    contribution_date: "2026-10-24",
    hours_spent: 12.0,
    created_at: "2026-10-24"
  },
  {
    _id: "cnt_405",
    user_id: "usr_103",
    project_id: "prj_202",
    task_id: "tsk_307",
    description: "Created bus coordinates mapping and validated schema against 12 campus bus routes.",
    contribution_date: "2026-10-08",
    hours_spent: 5.5,
    created_at: "2026-10-08"
  },
  {
    _id: "cnt_406",
    user_id: "usr_102",
    project_id: "prj_202",
    task_id: "tsk_308",
    description: "Created interactive SVG route diagram showing live bus stop indicators.",
    contribution_date: "2026-10-26",
    hours_spent: 4.0,
    created_at: "2026-10-26"
  },
  {
    _id: "cnt_407",
    user_id: "usr_104",
    project_id: "prj_203",
    task_id: "tsk_311",
    description: "Wrote resilient CSV intake script parsing 5,000 hourly power readings into MongoDB.",
    contribution_date: "2026-10-03",
    hours_spent: 7.0,
    created_at: "2026-10-03"
  },
  {
    _id: "cnt_408",
    user_id: "usr_106",
    project_id: "prj_203",
    task_id: "tsk_313",
    description: "Drafted initial introduction and methodology sections for student hostel audit.",
    contribution_date: "2026-10-26",
    hours_spent: 3.5,
    created_at: "2026-10-26"
  }
];

const INITIAL_LOGS: ActivityLog[] = [
  {
    _id: "log_501",
    action_type: "PROJECT_CREATED",
    project_id: "prj_201",
    user_id: "usr_101",
    description: "Created project 'MergeMate Core Platform'",
    timestamp: "2026-10-01 10:15:00"
  },
  {
    _id: "log_502",
    action_type: "MEMBER_ASSIGNED",
    project_id: "prj_201",
    user_id: "usr_102",
    description: "Assigned Sneha Rao to MergeMate Core Platform",
    timestamp: "2026-10-01 11:30:00"
  },
  {
    _id: "log_503",
    action_type: "TASK_COMPLETED",
    project_id: "prj_201",
    user_id: "usr_104",
    description: "Completed task 'Design MongoDB Aggregation Pipelines'",
    timestamp: "2026-10-17 16:45:00"
  },
  {
    _id: "log_504",
    action_type: "CONTRIBUTION_RECORDED",
    project_id: "prj_201",
    user_id: "usr_101",
    description: "Recorded 12.0 hours of contribution on Flask REST Routes",
    timestamp: "2026-10-24 18:20:00"
  },
  {
    _id: "log_505",
    action_type: "PROJECT_CREATED",
    project_id: "prj_202",
    user_id: "usr_102",
    description: "Created project 'Smart Campus Transit System'",
    timestamp: "2026-09-20 09:00:00"
  },
  {
    _id: "log_506",
    action_type: "TASK_COMPLETED",
    project_id: "prj_202",
    user_id: "usr_103",
    description: "Completed task 'Design GPS Route Geofencing Schema'",
    timestamp: "2026-10-09 14:10:00"
  }
];

// ==============================================================================
// 3. MAIN APPLICATION COMPONENT
// ==============================================================================
export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // MongoDB Collection State (Persistent via localStorage)
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('mm_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('mm_projects');
    return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
  });
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('mm_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });
  const [contributions, setContributions] = useState<Contribution[]>(() => {
    const saved = localStorage.getItem('mm_contributions');
    return saved ? JSON.parse(saved) : INITIAL_CONTRIBUTIONS;
  });
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>(() => {
    const saved = localStorage.getItem('mm_members');
    return saved ? JSON.parse(saved) : INITIAL_PROJECT_MEMBERS;
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('mm_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });

  // Notifications
  const [flashMessage, setFlashMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Modal Dialog States
  const [showProjectModal, setShowProjectModal] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [showMemberModal, setShowMemberModal] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);

  const [showTaskModal, setShowTaskModal] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskFormProjectId, setTaskFormProjectId] = useState<string>('');

  const [showContribModal, setShowContribModal] = useState<boolean>(false);
  const [editingContrib, setEditingContrib] = useState<Contribution | null>(null);

  const [assignCandidateUserId, setAssignCandidateUserId] = useState<string>('');

  // Filter States
  const [taskFilterProject, setTaskFilterProject] = useState<string>('');
  const [taskFilterMember, setTaskFilterMember] = useState<string>('');
  const [taskFilterStatus, setTaskFilterStatus] = useState<string>('');
  const [taskFilterPriority, setTaskFilterPriority] = useState<string>('');
  const [taskFilterOverdueOnly, setTaskFilterOverdueOnly] = useState<boolean>(false);

  const [contribFilterMember, setContribFilterMember] = useState<string>('');
  const [contribFilterProject, setContribFilterProject] = useState<string>('');

  const [projectSearch, setProjectSearch] = useState<string>('');
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>('');

  const [pipelineExpanded, setPipelineExpanded] = useState<Record<string, boolean>>({});

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('mm_users', JSON.stringify(users));
    localStorage.setItem('mm_projects', JSON.stringify(projects));
    localStorage.setItem('mm_tasks', JSON.stringify(tasks));
    localStorage.setItem('mm_contributions', JSON.stringify(contributions));
    localStorage.setItem('mm_members', JSON.stringify(projectMembers));
    localStorage.setItem('mm_logs', JSON.stringify(activityLogs));
  }, [users, projects, tasks, contributions, projectMembers, activityLogs]);

  const notify = (text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setFlashMessage({ text, type });
    setTimeout(() => setFlashMessage(null), 5000);
  };

  const logActivity = (action_type: string, description: string, project_id?: string | null, user_id?: string | null) => {
    const newLog: ActivityLog = {
      _id: `log_${Date.now()}`,
      action_type,
      project_id: project_id || null,
      user_id: user_id || null,
      description,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  const handleResetData = () => {
    if (window.confirm("Reload default college sample data? Any newly created test records will be refreshed.")) {
      setUsers(INITIAL_USERS);
      setProjects(INITIAL_PROJECTS);
      setTasks(INITIAL_TASKS);
      setContributions(INITIAL_CONTRIBUTIONS);
      setProjectMembers(INITIAL_PROJECT_MEMBERS);
      setActivityLogs(INITIAL_LOGS);
      notify("Sample data refreshed successfully!", "success");
    }
  };

  // ----------------------------------------------------------------------------
  // LIVE COMPUTED METRICS (Calculated directly from simulated MongoDB state)
  // ----------------------------------------------------------------------------
  const dashboardStats = useMemo(() => {
    const totalProjects = projects.length;
    const totalMembers = users.length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const pendingTasks = tasks.filter(t => t.status !== 'Completed').length;
    const overdueTasks = tasks.filter(t => t.status !== 'Completed' && t.deadline < todayDateStr).length;
    const completionPct = totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(1)) : 0;
    const totalHours = Number(contributions.reduce((acc, c) => acc + c.hours_spent, 0).toFixed(1));

    const projectProgressList = projects.map(p => {
      const pTasks = tasks.filter(t => t.project_id === p._id);
      const cTasks = pTasks.filter(t => t.status === 'Completed').length;
      const progress = pTasks.length > 0 ? Number(((cTasks / pTasks.length) * 100).toFixed(1)) : 0;
      const lead = users.find(u => u._id === p.project_lead);
      const isOverdue = p.deadline < todayDateStr && p.status !== 'Completed';

      return {
        ...p,
        lead_name: lead ? lead.name : 'Unassigned',
        total_tasks: pTasks.length,
        completed_tasks: cTasks,
        progress,
        isOverdue
      };
    });

    const upcomingProjects = [...projects]
      .filter(p => p.status !== 'Completed')
      .sort((a, b) => a.deadline.localeCompare(b.deadline))
      .slice(0, 5);

    return {
      totalProjects,
      totalMembers,
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      completionPct,
      totalHours,
      projectProgressList,
      upcomingProjects
    };
  }, [projects, users, tasks, contributions]);

  // ----------------------------------------------------------------------------
  // PROJECT CRUD ACTIONS
  // ----------------------------------------------------------------------------
  const handleSaveProject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const project_name = (formData.get('project_name') as string).trim();
    const description = (formData.get('description') as string).trim();
    const start_date = formData.get('start_date') as string;
    const deadline = formData.get('deadline') as string;
    const status = formData.get('status') as Project['status'];
    const project_lead = formData.get('project_lead') as string;

    if (!project_name || !start_date || !deadline || !project_lead) {
      notify("Please fill all required fields.", "error");
      return;
    }

    if (deadline < start_date) {
      notify("Deadline cannot be earlier than start date.", "error");
      return;
    }

    // Check duplicate name
    const dup = projects.find(p => p.project_name.toLowerCase() === project_name.toLowerCase() && p._id !== editingProject?._id);
    if (dup) {
      notify(`A project named '${project_name}' already exists.`, "error");
      return;
    }

    if (editingProject) {
      // Edit
      const updated: Project = {
        ...editingProject,
        project_name,
        description,
        start_date,
        deadline,
        status,
        project_lead,
        updated_at: todayDateStr
      };
      setProjects(prev => prev.map(p => p._id === editingProject._id ? updated : p));

      // Ensure lead is in project_members
      if (!projectMembers.some(pm => pm.project_id === editingProject._id && pm.user_id === project_lead)) {
        setProjectMembers(prev => [...prev, {
          _id: `pm_${Date.now()}`,
          project_id: editingProject._id,
          user_id: project_lead,
          assigned_at: todayDateStr
        }]);
      }

      logActivity("PROJECT_UPDATED", `Updated details for project '${project_name}'`, editingProject._id);
      notify(`Project '${project_name}' updated successfully.`);
    } else {
      // Create
      const newId = `prj_${Date.now()}`;
      const newProj: Project = {
        _id: newId,
        project_name,
        description,
        start_date,
        deadline,
        status,
        project_lead,
        member_ids: [project_lead],
        created_at: todayDateStr,
        updated_at: todayDateStr
      };
      setProjects(prev => [newProj, ...prev]);

      // Add lead to memberships
      setProjectMembers(prev => [...prev, {
        _id: `pm_${Date.now()}`,
        project_id: newId,
        user_id: project_lead,
        assigned_at: todayDateStr
      }]);

      logActivity("PROJECT_CREATED", `Created project '${project_name}'`, newId, project_lead);
      notify(`Project '${project_name}' created successfully!`);
    }

    setShowProjectModal(false);
    setEditingProject(null);
  };

  const handleDeleteProject = (projId: string) => {
    const proj = projects.find(p => p._id === projId);
    if (!proj) return;

    if (window.confirm(`Delete project '${proj.project_name}'? Associated tasks and contribution records will also be removed safely.`)) {
      setProjects(prev => prev.filter(p => p._id !== projId));
      setTasks(prev => prev.filter(t => t.project_id !== projId));
      setContributions(prev => prev.filter(c => c.project_id !== projId));
      setProjectMembers(prev => prev.filter(pm => pm.project_id !== projId));

      logActivity("PROJECT_DELETED", `Deleted project '${proj.project_name}'`);
      notify(`Project '${proj.project_name}' deleted.`);
      if (selectedProjectId === projId) setSelectedProjectId(null);
    }
  };

  // Assign member to project
  const handleAssignMemberToProject = (projId: string, userId: string) => {
    if (!userId) {
      notify("Select a team member to assign.", "error");
      return;
    }
    const exists = projectMembers.some(pm => pm.project_id === projId && pm.user_id === userId);
    if (exists) {
      notify("Member is already assigned to this project.", "warning");
      return;
    }

    setProjectMembers(prev => [...prev, {
      _id: `pm_${Date.now()}`,
      project_id: projId,
      user_id: userId,
      assigned_at: todayDateStr
    }]);

    setProjects(prev => prev.map(p => {
      if (p._id === projId && !p.member_ids.includes(userId)) {
        return { ...p, member_ids: [...p.member_ids, userId] };
      }
      return p;
    }));

    const u = users.find(x => x._id === userId);
    logActivity("MEMBER_ASSIGNED", `Assigned ${u?.name || 'Member'} to project`, projId, userId);
    notify(`${u?.name || 'Member'} assigned to project.`);
    setAssignCandidateUserId('');
  };

  // Remove member from project (with ACTIVE TASK PROTECTION)
  const handleRemoveMemberFromProject = (projId: string, userId: string) => {
    const proj = projects.find(p => p._id === projId);
    if (proj && proj.project_lead === userId) {
      notify("Cannot remove the project lead. Change the project lead first.", "error");
      return;
    }

    // CHECK: Active tasks
    const activeTasksCount = tasks.filter(t => t.project_id === projId && t.assigned_to === userId && t.status !== 'Completed').length;
    if (activeTasksCount > 0) {
      notify(`Cannot remove member: They have ${activeTasksCount} active task(s) in this project. Reassign or complete them first.`, "error");
      return;
    }

    setProjectMembers(prev => prev.filter(pm => !(pm.project_id === projId && pm.user_id === userId)));
    setProjects(prev => prev.map(p => {
      if (p._id === projId) {
        return { ...p, member_ids: p.member_ids.filter(id => id !== userId) };
      }
      return p;
    }));

    const u = users.find(x => x._id === userId);
    logActivity("MEMBER_REMOVED", `Removed ${u?.name || 'Member'} from project`, projId, userId);
    notify(`${u?.name || 'Member'} removed from project.`);
  };

  // ----------------------------------------------------------------------------
  // TEAM MEMBER CRUD ACTIONS
  // ----------------------------------------------------------------------------
  const handleSaveMember = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).trim();
    const email = (formData.get('email') as string).trim().toLowerCase();
    const role = (formData.get('role') as string).trim();
    const skillsRaw = (formData.get('skills') as string).trim();

    if (!name || !email || !role) {
      notify("Name, email, and role are required.", "error");
      return;
    }

    // Unique Email Validation
    const emailDup = users.find(u => u.email.toLowerCase() === email && u._id !== editingMember?._id);
    if (emailDup) {
      notify(`Email '${email}' is already registered to another member.`, "error");
      return;
    }

    const skills = skillsRaw ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    if (editingMember) {
      const updated: User = { ...editingMember, name, email, role, skills };
      setUsers(prev => prev.map(u => u._id === editingMember._id ? updated : u));
      logActivity("MEMBER_UPDATED", `Updated profile for '${name}'`, null, editingMember._id);
      notify(`Profile updated for ${name}.`);
    } else {
      const newId = `usr_${Date.now()}`;
      const newUser: User = { _id: newId, name, email, role, skills, created_at: todayDateStr };
      setUsers(prev => [...prev, newUser]);
      logActivity("MEMBER_CREATED", `Registered new team member '${name}'`, null, newId);
      notify(`Member '${name}' registered successfully!`);
    }

    setShowMemberModal(false);
    setEditingMember(null);
  };

  const handleDeleteMember = (userId: string) => {
    const u = users.find(x => x._id === userId);
    if (!u) return;

    // Check: is lead of any project?
    const isLeadOf = projects.filter(p => p.project_lead === userId);
    if (isLeadOf.length > 0) {
      notify(`Cannot delete ${u.name}: They are the lead for ${isLeadOf.length} project(s). Reassign project lead first.`, "error");
      return;
    }

    // Check: has active tasks?
    const activeTasks = tasks.filter(t => t.assigned_to === userId && t.status !== 'Completed');
    if (activeTasks.length > 0) {
      notify(`Cannot delete ${u.name}: They have ${activeTasks.length} active task(s). Reassign them first.`, "error");
      return;
    }

    if (window.confirm(`Remove member '${u.name}'?`)) {
      setUsers(prev => prev.filter(x => x._id !== userId));
      setProjectMembers(prev => prev.filter(pm => pm.user_id !== userId));
      setProjects(prev => prev.map(p => ({
        ...p,
        member_ids: p.member_ids.filter(id => id !== userId)
      })));

      logActivity("MEMBER_DELETED", `Deleted team member '${u.name}'`);
      notify(`Member '${u.name}' removed.`);
      if (selectedMemberId === userId) setSelectedMemberId(null);
    }
  };

  // ----------------------------------------------------------------------------
  // TASK CRUD ACTIONS
  // ----------------------------------------------------------------------------
  const handleSaveTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = (formData.get('title') as string).trim();
    const description = (formData.get('description') as string).trim();
    const project_id = formData.get('project_id') as string;
    const assigned_to = formData.get('assigned_to') as string;
    const priority = formData.get('priority') as Task['priority'];
    const status = formData.get('status') as Task['status'];
    const start_date = formData.get('start_date') as string;
    const deadline = formData.get('deadline') as string;

    if (!title || !project_id || !assigned_to || !start_date || !deadline) {
      notify("Please fill all required task fields.", "error");
      return;
    }

    if (deadline < start_date) {
      notify("Task deadline cannot be earlier than start date.", "error");
      return;
    }

    // STRICT VALIDATION: Assigned member must belong to selected project!
    const isMember = projectMembers.some(pm => pm.project_id === project_id && pm.user_id === assigned_to);
    if (!isMember) {
      notify("Validation Failed: The selected assignee is NOT a member of this project.", "error");
      return;
    }

    // Completion date calculation
    let completion_date: string | null = null;
    if (status === 'Completed') {
      completion_date = editingTask?.completion_date || todayDateStr;
    }

    if (editingTask) {
      // If status changed to Completed, set completion date. If reopened, clear it.
      if (status === 'Completed' && editingTask.status !== 'Completed') {
        completion_date = todayDateStr;
      } else if (status !== 'Completed') {
        completion_date = null;
      }

      const updated: Task = {
        ...editingTask,
        title,
        description,
        project_id,
        assigned_to,
        priority,
        status,
        start_date,
        deadline,
        completion_date,
        updated_at: todayDateStr
      };
      setTasks(prev => prev.map(t => t._id === editingTask._id ? updated : t));
      logActivity("TASK_UPDATED", `Updated task '${title}' (Status: ${status})`, project_id, assigned_to);
      notify(`Task '${title}' updated.`);
    } else {
      const newId = `tsk_${Date.now()}`;
      const newTask: Task = {
        _id: newId,
        title,
        description,
        project_id,
        assigned_to,
        priority,
        status,
        start_date,
        deadline,
        completion_date: status === 'Completed' ? todayDateStr : null,
        created_at: todayDateStr,
        updated_at: todayDateStr
      };
      setTasks(prev => [newTask, ...prev]);
      logActivity("TASK_CREATED", `Created task '${title}' (${priority} priority)`, project_id, assigned_to);
      notify(`Task '${title}' created successfully!`);
    }

    setShowTaskModal(false);
    setEditingTask(null);
  };

  const handleToggleTaskStatus = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t._id === taskId) {
        let newStatus: Task['status'] = 'To Do';
        let completion_date: string | null = null;

        if (t.status === 'To Do') {
          newStatus = 'In Progress';
        } else if (t.status === 'In Progress') {
          newStatus = 'Completed';
          completion_date = todayDateStr;
        } else {
          newStatus = 'In Progress';
          completion_date = null;
        }

        logActivity("TASK_STATUS_CHANGED", `Changed status of '${t.title}' to '${newStatus}'`, t.project_id, t.assigned_to);
        notify(`Task '${t.title}' marked as ${newStatus}.`);
        return { ...t, status: newStatus, completion_date, updated_at: todayDateStr };
      }
      return t;
    }));
  };

  const handleDeleteTask = (taskId: string) => {
    const t = tasks.find(x => x._id === taskId);
    if (!t) return;

    if (window.confirm(`Delete task '${t.title}'? Associated contribution logs will also be cleaned up.`)) {
      setTasks(prev => prev.filter(x => x._id !== taskId));
      setContributions(prev => prev.filter(c => c.task_id !== taskId));

      logActivity("TASK_DELETED", `Deleted task '${t.title}'`, t.project_id, t.assigned_to);
      notify(`Task '${t.title}' deleted.`);
    }
  };

  // ----------------------------------------------------------------------------
  // CONTRIBUTION CRUD ACTIONS
  // ----------------------------------------------------------------------------
  const [contribFormProjectId, setContribFormProjectId] = useState<string>('');
  const [contribFormUserId, setContribFormUserId] = useState<string>('');

  const handleSaveContribution = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const description = (formData.get('description') as string).trim();
    const contribution_date = formData.get('contribution_date') as string;
    const hours_spent = parseFloat(formData.get('hours_spent') as string);

    if (editingContrib) {
      if (isNaN(hours_spent) || hours_spent <= 0) {
        notify("Hours spent must be a positive number.", "error");
        return;
      }

      const updated: Contribution = {
        ...editingContrib,
        description,
        contribution_date,
        hours_spent
      };
      setContributions(prev => prev.map(c => c._id === editingContrib._id ? updated : c));
      logActivity("CONTRIBUTION_UPDATED", `Updated contribution to ${hours_spent} hours`, editingContrib.project_id, editingContrib.user_id);
      notify("Contribution record updated.");
    } else {
      const project_id = contribFormProjectId;
      const user_id = contribFormUserId;
      const task_id = formData.get('task_id') as string;

      if (!project_id || !user_id || !task_id || !description || !contribution_date) {
        notify("All fields are mandatory.", "error");
        return;
      }

      if (isNaN(hours_spent) || hours_spent <= 0) {
        notify("Hours spent must be a positive decimal number greater than 0.", "error");
        return;
      }

      // STRICT VALIDATION: Task must belong to project AND be assigned to that member
      const task = tasks.find(t => t._id === task_id && t.project_id === project_id && t.assigned_to === user_id);
      if (!task) {
        notify("Validation Failed: Task does not match project or assignee.", "error");
        return;
      }

      const newId = `cnt_${Date.now()}`;
      const newContrib: Contribution = {
        _id: newId,
        user_id,
        project_id,
        task_id,
        description,
        contribution_date,
        hours_spent,
        created_at: todayDateStr
      };

      setContributions(prev => [newContrib, ...prev]);
      const user = users.find(u => u._id === user_id);
      logActivity("CONTRIBUTION_RECORDED", `Recorded ${hours_spent} hrs by ${user?.name || 'Member'} on '${task.title}'`, project_id, user_id);
      notify(`Logged ${hours_spent} hours contribution successfully!`);
    }

    setShowContribModal(false);
    setEditingContrib(null);
  };

  const handleDeleteContribution = (contribId: string) => {
    const c = contributions.find(x => x._id === contribId);
    if (!c) return;

    if (window.confirm("Delete this contribution record?")) {
      setContributions(prev => prev.filter(x => x._id !== contribId));
      logActivity("CONTRIBUTION_DELETED", `Deleted ${c.hours_spent} hours contribution record`, c.project_id, c.user_id);
      notify("Contribution record deleted.");
    }
  };

  // ----------------------------------------------------------------------------
  // REPORT AGGREGATION CALCULATIONS (Calculates results matching the 8 Pipelines)
  // ----------------------------------------------------------------------------
  const report1_TaskCompletionByProject = useMemo(() => {
    return projects.map(p => {
      const pTasks = tasks.filter(t => t.project_id === p._id);
      const completed = pTasks.filter(t => t.status === 'Completed').length;
      const pct = pTasks.length > 0 ? Number(((completed / pTasks.length) * 100).toFixed(1)) : 0;
      return {
        _id: p._id,
        project_name: p.project_name,
        status: p.status,
        total_tasks: pTasks.length,
        completed_tasks: completed,
        completion_pct: pct
      };
    }).sort((a, b) => b.completion_pct - a.completion_pct);
  }, [projects, tasks]);

  const report2_MemberTasksSummary = useMemo(() => {
    return users.map(u => {
      const uTasks = tasks.filter(t => t.assigned_to === u._id);
      const completed = uTasks.filter(t => t.status === 'Completed').length;
      const pending = uTasks.filter(t => t.status !== 'Completed').length;
      return {
        _id: u._id,
        name: u.name,
        role: u.role,
        email: u.email,
        total_tasks: uTasks.length,
        completed_tasks: completed,
        pending_tasks: pending
      };
    }).sort((a, b) => b.total_tasks - a.total_tasks);
  }, [users, tasks]);

  const report3_OverdueTasks = useMemo(() => {
    return tasks
      .filter(t => t.status !== 'Completed' && t.deadline < todayDateStr)
      .map(t => {
        const p = projects.find(x => x._id === t.project_id);
        const m = users.find(x => x._id === t.assigned_to);
        return {
          ...t,
          project_name: p ? p.project_name : 'Unknown',
          member_name: m ? m.name : 'Unassigned'
        };
      })
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
  }, [tasks, projects, users]);

  const report4_WorkloadDistribution = useMemo(() => {
    const activeTasks = tasks.filter(t => t.status !== 'Completed');
    const counts: Record<string, number> = {};
    activeTasks.forEach(t => {
      counts[t.assigned_to] = (counts[t.assigned_to] || 0) + 1;
    });

    return Object.entries(counts).map(([userId, count]) => {
      const u = users.find(x => x._id === userId);
      return {
        user_id: userId,
        member_name: u ? u.name : 'Unknown',
        role: u ? u.role : 'N/A',
        active_task_count: count
      };
    }).sort((a, b) => b.active_task_count - a.active_task_count);
  }, [tasks, users]);

  const report5_ContributionHoursByMember = useMemo(() => {
    const totals: Record<string, { hours: number; count: number }> = {};
    contributions.forEach(c => {
      if (!totals[c.user_id]) totals[c.user_id] = { hours: 0, count: 0 };
      totals[c.user_id].hours += c.hours_spent;
      totals[c.user_id].count += 1;
    });

    return Object.entries(totals).map(([userId, data]) => {
      const u = users.find(x => x._id === userId);
      return {
        user_id: userId,
        member_name: u ? u.name : 'Unknown',
        role: u ? u.role : 'N/A',
        total_hours: Number(data.hours.toFixed(1)),
        entries_count: data.count
      };
    }).sort((a, b) => b.total_hours - a.total_hours);
  }, [contributions, users]);

  const report6_ProjectDeadlineAndProgress = useMemo(() => {
    return projects.map(p => {
      const pTasks = tasks.filter(t => t.project_id === p._id);
      const completed = pTasks.filter(t => t.status === 'Completed').length;
      const progress = pTasks.length > 0 ? Number(((completed / pTasks.length) * 100).toFixed(1)) : 0;
      const isOverdue = p.deadline < todayDateStr && p.status !== 'Completed';
      return {
        ...p,
        total_tasks: pTasks.length,
        completed_tasks: completed,
        progress,
        isOverdue
      };
    }).sort((a, b) => a.deadline.localeCompare(b.deadline));
  }, [projects, tasks]);

  const report7_MembersWithoutTasks = useMemo(() => {
    const assignedUserIds = new Set(tasks.map(t => t.assigned_to));
    return users.filter(u => !assignedUserIds.has(u._id));
  }, [users, tasks]);

  const report8_TasksApproachingDeadlines = useMemo(() => {
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0];

    return tasks
      .filter(t => t.status !== 'Completed' && t.deadline >= todayDateStr && t.deadline <= sevenDaysStr)
      .map(t => {
        const p = projects.find(x => x._id === t.project_id);
        const m = users.find(x => x._id === t.assigned_to);
        return {
          ...t,
          project_name: p ? p.project_name : 'Unknown',
          member_name: m ? m.name : 'Unassigned'
        };
      })
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
  }, [tasks, projects, users]);

  // ----------------------------------------------------------------------------
  // FILTERED LISTS FOR TABLES
  // ----------------------------------------------------------------------------
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchName = !projectSearch || p.project_name.toLowerCase().includes(projectSearch.toLowerCase());
      const matchStatus = !projectStatusFilter || p.status === projectStatusFilter;
      return matchName && matchStatus;
    });
  }, [projects, projectSearch, projectStatusFilter]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchProj = !taskFilterProject || t.project_id === taskFilterProject;
      const matchMember = !taskFilterMember || t.assigned_to === taskFilterMember;
      const matchStatus = !taskFilterStatus || t.status === taskFilterStatus;
      const matchPriority = !taskFilterPriority || t.priority === taskFilterPriority;
      const matchOverdue = !taskFilterOverdueOnly || (t.status !== 'Completed' && t.deadline < todayDateStr);
      return matchProj && matchMember && matchStatus && matchPriority && matchOverdue;
    });
  }, [tasks, taskFilterProject, taskFilterMember, taskFilterStatus, taskFilterPriority, taskFilterOverdueOnly]);

  const filteredContributions = useMemo(() => {
    return contributions.filter(c => {
      const matchMember = !contribFilterMember || c.user_id === contribFilterMember;
      const matchProj = !contribFilterProject || c.project_id === contribFilterProject;
      return matchMember && matchProj;
    });
  }, [contributions, contribFilterMember, contribFilterProject]);

  // Dependent dropdowns for task form
  const membersInTaskFormProject = useMemo(() => {
    if (!taskFormProjectId) return [];
    const pMembers = projectMembers.filter(pm => pm.project_id === taskFormProjectId);
    return users.filter(u => pMembers.some(pm => pm.user_id === u._id));
  }, [taskFormProjectId, projectMembers, users]);

  // Dependent dropdowns for contribution form
  const membersInContribProject = useMemo(() => {
    if (!contribFormProjectId) return [];
    const pMembers = projectMembers.filter(pm => pm.project_id === contribFormProjectId);
    return users.filter(u => pMembers.some(pm => pm.user_id === u._id));
  }, [contribFormProjectId, projectMembers, users]);

  const tasksForContribMember = useMemo(() => {
    if (!contribFormProjectId || !contribFormUserId) return [];
    return tasks.filter(t => t.project_id === contribFormProjectId && t.assigned_to === contribFormUserId);
  }, [contribFormProjectId, contribFormUserId, tasks]);

  // Selected project details view helper
  const selectedProjectObj = useMemo(() => {
    if (!selectedProjectId) return null;
    const p = projects.find(x => x._id === selectedProjectId);
    if (!p) return null;

    const lead = users.find(u => u._id === p.project_lead);
    const pMembers = projectMembers.filter(pm => pm.project_id === p._id);
    const assignedUsers = users.filter(u => pMembers.some(pm => pm.user_id === u._id));
    const unassignedUsers = users.filter(u => !pMembers.some(pm => pm.user_id === u._id));
    const pTasks = tasks.filter(t => t.project_id === p._id);
    const completedTasks = pTasks.filter(t => t.status === 'Completed').length;
    const overdueTasks = pTasks.filter(t => t.status !== 'Completed' && t.deadline < todayDateStr).length;
    const progressPct = pTasks.length > 0 ? Number(((completedTasks / pTasks.length) * 100).toFixed(1)) : 0;
    const projectHours = Number(contributions.filter(c => c.project_id === p._id).reduce((acc, c) => acc + c.hours_spent, 0).toFixed(1));

    return {
      ...p,
      lead,
      assignedUsers,
      unassignedUsers,
      tasks: pTasks,
      total_tasks: pTasks.length,
      completed_tasks: completedTasks,
      overdue_tasks: overdueTasks,
      progressPct,
      projectHours
    };
  }, [selectedProjectId, projects, users, projectMembers, tasks, contributions]);

  // Selected member details view helper
  const selectedMemberObj = useMemo(() => {
    if (!selectedMemberId) return null;
    const u = users.find(x => x._id === selectedMemberId);
    if (!u) return null;

    const memberships = projectMembers.filter(pm => pm.user_id === u._id);
    const userProjects = projects.filter(p => memberships.some(pm => pm.project_id === p._id));
    const userTasks = tasks.filter(t => t.assigned_to === u._id);
    const completedTasks = userTasks.filter(t => t.status === 'Completed');
    const pendingTasks = userTasks.filter(t => t.status !== 'Completed');
    const overdueTasks = pendingTasks.filter(t => t.deadline < todayDateStr);
    const userContribs = contributions.filter(c => c.user_id === u._id);
    const totalHours = Number(userContribs.reduce((acc, c) => acc + c.hours_spent, 0).toFixed(1));

    return {
      ...u,
      projects: userProjects,
      tasks: userTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      contributions: userContribs,
      totalHours
    };
  }, [selectedMemberId, users, projectMembers, projects, tasks, contributions]);

  const togglePipeline = (repId: string) => {
    setPipelineExpanded(prev => ({ ...prev, [repId]: !prev[repId] }));
  };

  // ----------------------------------------------------------------------------
  // RENDER INTERFACE
  // ----------------------------------------------------------------------------
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* 1. SIDEBAR */}
      <aside className="w-64 bg-slate-950 text-slate-100 flex flex-col shrink-0 border-r border-slate-900 sticky top-0 h-screen z-20">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-900">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-900/40">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              <span>MergeMate</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">DBMS Mini Project</div>
          </div>
        </div>

        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-2">
            Main Modules
          </div>

          <button
            onClick={() => { setActiveTab('dashboard'); setSelectedProjectId(null); setSelectedMemberId(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'dashboard' ? 'bg-blue-900/80 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <FolderKanban className="w-4 h-4 text-blue-400" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => { setActiveTab('projects'); setSelectedMemberId(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'projects' ? 'bg-blue-900/80 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <FolderKanban className="w-4 h-4 text-indigo-400" />
            <span>Projects</span>
          </button>

          <button
            onClick={() => { setActiveTab('members'); setSelectedProjectId(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'members' ? 'bg-blue-900/80 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-purple-400" />
            <span>Team Members</span>
          </button>

          <button
            onClick={() => { setActiveTab('tasks'); setSelectedProjectId(null); setSelectedMemberId(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'tasks' ? 'bg-blue-900/80 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <span>Tasks</span>
          </button>

          <button
            onClick={() => { setActiveTab('contributions'); setSelectedProjectId(null); setSelectedMemberId(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'contributions' ? 'bg-blue-900/80 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Contributions</span>
          </button>

          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-4 pb-2">
            Database &amp; Viva
          </div>

          <button
            onClick={() => { setActiveTab('reports'); setSelectedProjectId(null); setSelectedMemberId(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'reports' ? 'bg-blue-900/80 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span>MongoDB Reports</span>
          </button>

          <button
            onClick={() => { setActiveTab('activity'); setSelectedProjectId(null); setSelectedMemberId(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'activity' ? 'bg-blue-900/80 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <History className="w-4 h-4 text-rose-400" />
            <span>Audit History</span>
          </button>

          <button
            onClick={() => { setActiveTab('viva_guide'); setSelectedProjectId(null); setSelectedMemberId(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'viva_guide' ? 'bg-blue-900/80 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4 text-yellow-400" />
            <span>Viva Prep &amp; Setup</span>
          </button>
        </nav>

        {/* Database Status Pill in Sidebar */}
        <div className="p-3 border-t border-slate-900">
          <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"></span>
              <div>
                <div className="text-xs font-semibold text-slate-200">MongoDB Local</div>
                <div className="text-[10px] font-mono text-slate-400">127.0.0.1:27017</div>
              </div>
            </div>
            <button
              onClick={handleResetData}
              title="Reset Sample Data"
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <span>MergeMate</span>
            <span>/</span>
            <span className="text-slate-900 font-semibold capitalize">
              {activeTab.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setEditingTask(null);
                setTaskFormProjectId(projects[0]?._id || '');
                setShowTaskModal(true);
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Task</span>
            </button>

            <button
              onClick={() => {
                setEditingProject(null);
                setShowProjectModal(true);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-900 hover:bg-blue-950 text-white transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          </div>
        </header>

        {/* Flash Message Banner */}
        {flashMessage && (
          <div className={`px-6 py-2.5 text-xs font-medium flex items-center justify-between ${
            flashMessage.type === 'error' ? 'bg-rose-50 text-rose-800 border-b border-rose-200' :
            flashMessage.type === 'warning' ? 'bg-amber-50 text-amber-800 border-b border-amber-200' :
            'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
          }`}>
            <span>{flashMessage.text}</span>
            <button onClick={() => setFlashMessage(null)} className="text-slate-500 hover:text-slate-900 text-sm font-bold ml-4">&times;</button>
          </div>
        )}

        {/* Main Content Area */}
        <main className="p-6 max-w-7xl w-full mx-auto space-y-6">

          {/* ================================================================ */}
          {/* TAB 1: DASHBOARD                                                 */}
          {/* ================================================================ */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Project Overview &amp; Analytics</h1>
                <p className="text-xs text-slate-500 mt-1">Real-time team contribution metrics calculated via MongoDB queries &amp; aggregations.</p>
              </div>

              {/* 6 Key MongoDB Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="text-xs font-semibold text-slate-500">Active Projects</div>
                  <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">{dashboardStats.totalProjects}</div>
                  <button onClick={() => setActiveTab('projects')} className="text-[11px] text-blue-900 font-semibold hover:underline mt-2 text-left">
                    View all projects &rarr;
                  </button>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="text-xs font-semibold text-slate-500">Team Members</div>
                  <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">{dashboardStats.totalMembers}</div>
                  <button onClick={() => setActiveTab('members')} className="text-[11px] text-indigo-700 font-semibold hover:underline mt-2 text-left">
                    Manage team &rarr;
                  </button>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="text-xs font-semibold text-slate-500">Total Tasks</div>
                  <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">{dashboardStats.totalTasks}</div>
                  <div className="text-[11px] text-slate-500 mt-2">
                    <span className="text-emerald-700 font-semibold">{dashboardStats.completedTasks}</span> done &middot; {dashboardStats.pendingTasks} pend
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="text-xs font-semibold text-slate-500">Completion Rate</div>
                  <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">{dashboardStats.completionPct}%</div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                    <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${dashboardStats.completionPct}%` }}></div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="text-xs font-semibold text-slate-500">Overdue Tasks</div>
                  <div className={`text-2xl font-bold mt-2 font-mono tabular-nums ${dashboardStats.overdueTasks > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                    {dashboardStats.overdueTasks}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2">
                    {dashboardStats.overdueTasks > 0 ? (
                      <button onClick={() => { setActiveTab('tasks'); setTaskFilterOverdueOnly(true); }} className="text-rose-700 font-semibold hover:underline">
                        Review overdue &rarr;
                      </button>
                    ) : (
                      <span className="text-emerald-700">All on track</span>
                    )}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="text-xs font-semibold text-slate-500">Total Effort</div>
                  <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">
                    {dashboardStats.totalHours} <span className="text-xs font-medium text-slate-500">hrs</span>
                  </div>
                  <button onClick={() => setActiveTab('contributions')} className="text-[11px] text-amber-700 font-semibold hover:underline mt-2 text-left">
                    Contribution logs &rarr;
                  </button>
                </div>
              </div>

              {/* Two Column Layout: Project Progress & Upcoming/Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Project Progress Breakdown */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Project Progress Breakdown</h2>
                      <p className="text-xs text-slate-500">Completed Tasks &divide; Total Tasks &times; 100</p>
                    </div>
                    <button onClick={() => setActiveTab('projects')} className="text-xs font-semibold text-blue-900 hover:underline">
                      View All
                    </button>
                  </div>

                  <div className="space-y-4">
                    {dashboardStats.projectProgressList.map(p => (
                      <div key={p._id} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setSelectedProjectId(p._id); setActiveTab('projects'); }}
                              className="font-bold text-sm text-slate-900 hover:text-blue-900 text-left"
                            >
                              {p.project_name}
                            </button>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">{p.status}</span>
                            {p.isOverdue && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800">Overdue</span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-slate-800 font-mono tabular-nums">
                            {p.progress}% <span className="text-slate-400 font-normal">({p.completed_tasks}/{p.total_tasks})</span>
                          </div>
                        </div>

                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${p.progress === 100 ? 'bg-emerald-600' : 'bg-blue-800'}`}
                            style={{ width: `${p.progress}%` }}
                          ></div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                          <span>Lead: <strong>{p.lead_name}</strong></span>
                          <span>Deadline: <strong className="font-mono">{p.deadline}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right 1 Col: Upcoming Deadlines & Recent Activities */}
                <div className="space-y-6">
                  {/* Upcoming Deadlines */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-900">Upcoming Deadlines</h3>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Chronological</span>
                    </div>

                    <div className="space-y-2.5">
                      {dashboardStats.upcomingProjects.map(p => (
                        <div key={p._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex flex-col items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-blue-900 uppercase">{p.deadline.split('-')[1]}</span>
                            <span className="text-xs font-bold text-slate-900 font-mono">{p.deadline.split('-')[2]}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-slate-900 truncate">{p.project_name}</div>
                            <div className="text-[11px] text-slate-500">Status: {p.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Activity Log */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-900">Recent Audit History</h3>
                      <button onClick={() => setActiveTab('activity')} className="text-xs font-semibold text-blue-900 hover:underline">
                        Full Log
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      {activityLogs.slice(0, 5).map(act => (
                        <div key={act._id} className="flex items-start gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1 shrink-0"></span>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-slate-800 leading-snug">{act.description}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{act.timestamp}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 2: PROJECTS & PROJECT DETAILS SUBVIEW                        */}
          {/* ================================================================ */}
          {activeTab === 'projects' && !selectedProjectId && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Project Management</h1>
                  <p className="text-xs text-slate-500 mt-1">Manage team projects, assign student leads, track deadlines and task milestones.</p>
                </div>
                <button
                  onClick={() => { setEditingProject(null); setShowProjectModal(true); }}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Project</span>
                </button>
              </div>

              {/* Filters */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-[260px]">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search projects..."
                      value={projectSearch}
                      onChange={e => setProjectSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-900"
                    />
                  </div>
                  <select
                    value={projectStatusFilter}
                    onChange={e => setProjectStatusFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="">All Statuses</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Not Started">Not Started</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>

                {(projectSearch || projectStatusFilter) && (
                  <button
                    onClick={() => { setProjectSearch(''); setProjectStatusFilter(''); }}
                    className="text-xs text-slate-500 hover:text-slate-900 font-semibold"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Project Name</th>
                      <th className="py-3 px-4">Project Lead</th>
                      <th className="py-3 px-4">Members</th>
                      <th className="py-3 px-4">Progress</th>
                      <th className="py-3 px-4">Timeline</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProjects.map(p => {
                      const lead = users.find(u => u._id === p.project_lead);
                      const pTasks = tasks.filter(t => t.project_id === p._id);
                      const cTasks = pTasks.filter(t => t.status === 'Completed').length;
                      const progress = pTasks.length > 0 ? Number(((cTasks / pTasks.length) * 100).toFixed(1)) : 0;
                      const isOverdue = p.deadline < todayDateStr && p.status !== 'Completed';

                      return (
                        <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            <button
                              onClick={() => setSelectedProjectId(p._id)}
                              className="hover:text-blue-900 hover:underline text-left font-bold"
                            >
                              {p.project_name}
                            </button>
                            <div className="text-[11px] text-slate-400 font-normal truncate max-w-xs">{p.description}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {lead ? lead.name : 'Unassigned'}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                              {p.member_ids.length} members
                            </span>
                          </td>
                          <td className="py-3 px-4 min-w-[140px]">
                            <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
                              <span className="font-bold">{progress}%</span>
                              <span className="text-slate-400">({cTasks}/{pTasks.length})</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${progress === 100 ? 'bg-emerald-600' : 'bg-blue-900'}`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            <div>Start: {p.start_date}</div>
                            <div className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'}>Due: {p.deadline}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              p.status === 'Completed' ? 'bg-emerald-50 text-emerald-800' :
                              p.status === 'In Progress' ? 'bg-blue-50 text-blue-900' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedProjectId(p._id)}
                                className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                                title="View Details"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setEditingProject(p); setShowProjectModal(true); }}
                                className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProject(p._id)}
                                className="p-1.5 rounded hover:bg-rose-50 text-rose-600"
                                title="Delete Project"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PROJECT DETAILS VIEW */}
          {activeTab === 'projects' && selectedProjectObj && (
            <div className="space-y-6">
              <button
                onClick={() => setSelectedProjectId(null)}
                className="text-xs font-semibold text-blue-900 hover:underline flex items-center gap-1"
              >
                &larr; Back to all projects
              </button>

              {/* Project Hero Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-50 text-blue-900">
                        {selectedProjectObj.status}
                      </span>
                      {selectedProjectObj.deadline < todayDateStr && selectedProjectObj.status !== 'Completed' && (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-rose-100 text-rose-800">
                          Overdue Deadline
                        </span>
                      )}
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mt-2">{selectedProjectObj.project_name}</h1>
                    <p className="text-xs text-slate-600 max-w-2xl mt-1">{selectedProjectObj.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingTask(null);
                        setTaskFormProjectId(selectedProjectObj._id);
                        setShowTaskModal(true);
                      }}
                      className="px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white font-semibold text-xs rounded-lg flex items-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Task</span>
                    </button>
                    <button
                      onClick={() => { setEditingProject(selectedProjectObj); setShowProjectModal(true); }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg"
                    >
                      Edit Project
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Project Lead</span>
                    <strong className="text-slate-900">{selectedProjectObj.lead?.name || 'Unassigned'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Timeline</span>
                    <span className="font-mono">{selectedProjectObj.start_date} &rarr; {selectedProjectObj.deadline}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Total Logged Effort</span>
                    <strong className="text-blue-900 font-mono">{selectedProjectObj.projectHours} hrs</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Task Progress</span>
                    <strong className="text-emerald-700 font-mono">{selectedProjectObj.progressPct}% ({selectedProjectObj.completed_tasks}/{selectedProjectObj.total_tasks})</strong>
                  </div>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${selectedProjectObj.progressPct === 100 ? 'bg-emerald-600' : 'bg-blue-900'}`}
                    style={{ width: `${selectedProjectObj.progressPct}%` }}
                  ></div>
                </div>
              </div>

              {/* Two Column: Members on Left, Tasks on Right */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Project Members (1 Col) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="font-bold text-sm text-slate-900">
                      Assigned Members ({selectedProjectObj.assignedUsers.length})
                    </h3>
                  </div>

                  {/* Assign Member Form */}
                  {selectedProjectObj.unassignedUsers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <select
                        value={assignCandidateUserId}
                        onChange={e => setAssignCandidateUserId(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="">Select candidate to assign...</option>
                        {selectedProjectObj.unassignedUsers.map(u => (
                          <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssignMemberToProject(selectedProjectObj._id, assignCandidateUserId)}
                        className="px-3 py-1.5 bg-slate-800 text-white font-semibold text-xs rounded-lg hover:bg-slate-900"
                      >
                        Assign
                      </button>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {selectedProjectObj.assignedUsers.map(m => (
                      <div key={m._id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900">{m.name}</span>
                            {selectedProjectObj.project_lead === m._id && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">Lead</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">{m.role}</div>
                        </div>

                        {selectedProjectObj.project_lead !== m._id && (
                          <button
                            onClick={() => handleRemoveMemberFromProject(selectedProjectObj._id, m._id)}
                            className="text-xs text-rose-600 hover:text-rose-900 font-semibold"
                            title="Remove member (blocked if active tasks exist)"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Project Tasks (2 Cols) */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        Project Tasks ({selectedProjectObj.tasks.length})
                      </h3>
                      <div className="text-[11px] text-slate-500">
                        {selectedProjectObj.completed_tasks} Completed &middot; {selectedProjectObj.tasks.length - selectedProjectObj.completed_tasks} Pending
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditingTask(null);
                        setTaskFormProjectId(selectedProjectObj._id);
                        setShowTaskModal(true);
                      }}
                      className="px-3 py-1 text-xs font-semibold bg-blue-900 text-white rounded-lg hover:bg-blue-950"
                    >
                      + Add Task
                    </button>
                  </div>

                  <div className="space-y-3">
                    {selectedProjectObj.tasks.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400">No tasks added to this project yet.</div>
                    ) : (
                      selectedProjectObj.tasks.map(t => {
                        const assignee = users.find(u => u._id === t.assigned_to);
                        const isOverdue = t.status !== 'Completed' && t.deadline < todayDateStr;

                        return (
                          <div key={t._id} className={`p-3.5 rounded-lg border ${isOverdue ? 'border-rose-200 bg-rose-50/40' : 'border-slate-100 bg-slate-50/50'} space-y-1.5`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">{t.title}</span>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                  t.priority === 'High' ? 'bg-rose-100 text-rose-800' :
                                  t.priority === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {t.priority}
                                </span>
                              </div>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                t.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                                t.status === 'In Progress' ? 'bg-blue-100 text-blue-900' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {t.status}
                              </span>
                            </div>

                            {t.description && <p className="text-[11px] text-slate-600">{t.description}</p>}

                            <div className="flex items-center justify-between text-xs pt-1">
                              <span className="text-slate-500">
                                Assigned: <strong>{assignee?.name || 'Unassigned'}</strong> &middot; <span className={isOverdue ? 'text-rose-600 font-bold font-mono' : 'text-slate-500 font-mono'}>Due: {t.deadline}</span>
                              </span>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleTaskStatus(t._id)}
                                  className="text-[11px] px-2 py-0.5 rounded bg-white border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700"
                                >
                                  {t.status === 'To Do' ? 'Start →' : t.status === 'In Progress' ? '✓ Mark Done' : '↺ Reopen'}
                                </button>
                                <button
                                  onClick={() => { setEditingTask(t); setTaskFormProjectId(t.project_id); setShowTaskModal(true); }}
                                  className="text-slate-400 hover:text-slate-700"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(t._id)}
                                  className="text-rose-400 hover:text-rose-700"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 3: TEAM MEMBERS & MEMBER DETAILS SUBVIEW                    */}
          {/* ================================================================ */}
          {activeTab === 'members' && !selectedMemberId && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team Member Directory</h1>
                  <p className="text-xs text-slate-500 mt-1">Track student developers, roles, skill arrays, and logged contribution hours.</p>
                </div>
                <button
                  onClick={() => { setEditingMember(null); setShowMemberModal(true); }}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register Member</span>
                </button>
              </div>

              {/* Members Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {users.map(u => {
                  const mShips = projectMembers.filter(pm => pm.user_id === u._id);
                  const mTasks = tasks.filter(t => t.assigned_to === u._id);
                  const doneTasks = mTasks.filter(t => t.status === 'Completed').length;
                  const mHours = Number(contributions.filter(c => c.user_id === u._id).reduce((acc, c) => acc + c.hours_spent, 0).toFixed(1));

                  return (
                    <div key={u._id} className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-bold text-sm flex items-center justify-center">
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setEditingMember(u); setShowMemberModal(true); }}
                              className="p-1 rounded text-slate-400 hover:text-slate-700"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMember(u._id)}
                              className="p-1 rounded text-rose-400 hover:text-rose-700"
                              title="Delete Member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <button
                            onClick={() => setSelectedMemberId(u._id)}
                            className="font-bold text-sm text-slate-900 hover:text-blue-900 text-left"
                          >
                            {u.name}
                          </button>
                          <div className="text-xs text-slate-500 font-medium">{u.role}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                        </div>

                        {/* Skills */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {u.skills.map((s, idx) => (
                            <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Stats Strip */}
                      <div className="grid grid-cols-4 gap-1 bg-slate-50 p-2.5 rounded-lg text-center text-xs border border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Projects</span>
                          <strong className="text-slate-900 font-mono">{mShips.length}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Tasks</span>
                          <strong className="text-slate-900 font-mono">{mTasks.length}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Done</span>
                          <strong className="text-emerald-700 font-mono">{doneTasks}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Hours</span>
                          <strong className="text-blue-900 font-mono">{mHours}</strong>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedMemberId(u._id)}
                        className="w-full py-1.5 text-xs font-semibold text-blue-900 bg-blue-50/60 hover:bg-blue-100/80 rounded-lg transition-colors text-center"
                      >
                        View Full Profile &rarr;
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MEMBER PROFILE VIEW */}
          {activeTab === 'members' && selectedMemberObj && (
            <div className="space-y-6">
              <button
                onClick={() => setSelectedMemberId(null)}
                className="text-xs font-semibold text-blue-900 hover:underline flex items-center gap-1"
              >
                &larr; Back to all team members
              </button>

              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-700 to-indigo-600 text-white font-bold text-xl flex items-center justify-center shrink-0 shadow-md">
                    {selectedMemberObj.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">{selectedMemberObj.name}</h1>
                    <div className="text-xs text-slate-500 font-medium">{selectedMemberObj.role}</div>
                    <div className="text-xs text-slate-400 font-mono">{selectedMemberObj.email}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedMemberObj.skills.map((s, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-center border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
                  <div>
                    <span className="text-2xl font-bold text-slate-900 font-mono block">{selectedMemberObj.projects.length}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Projects</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-emerald-700 font-mono block">{selectedMemberObj.completedTasks.length}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Done Tasks</span>
                  </div>
                  <div>
                    <span className={`text-2xl font-bold font-mono block ${selectedMemberObj.overdueTasks.length > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                      {selectedMemberObj.overdueTasks.length}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Overdue</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-blue-900 font-mono block">{selectedMemberObj.totalHours}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Hours Logged</span>
                  </div>
                </div>
              </div>

              {/* Tasks and Contributions Split */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Member Tasks */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                    Assigned Tasks ({selectedMemberObj.tasks.length})
                  </h3>

                  <div className="space-y-2.5">
                    {selectedMemberObj.tasks.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400">No tasks currently assigned.</div>
                    ) : (
                      selectedMemberObj.tasks.map(t => {
                        const p = projects.find(x => x._id === t.project_id);
                        const isOverdue = t.status !== 'Completed' && t.deadline < todayDateStr;

                        return (
                          <div key={t._id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                            <div>
                              <div className="font-bold text-slate-900">{t.title}</div>
                              <div className="text-[11px] text-slate-500">{p?.project_name} &middot; <span className={isOverdue ? 'text-rose-600 font-bold font-mono' : 'font-mono'}>Due: {t.deadline}</span></div>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              t.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                              t.status === 'In Progress' ? 'bg-blue-100 text-blue-900' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {t.status}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Member Contributions */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                    Contribution Logs ({selectedMemberObj.contributions.length})
                  </h3>

                  <div className="space-y-2.5">
                    {selectedMemberObj.contributions.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400">No contribution hours logged yet.</div>
                    ) : (
                      selectedMemberObj.contributions.map(c => {
                        const p = projects.find(x => x._id === c.project_id);
                        const t = tasks.find(x => x._id === c.task_id);

                        return (
                          <div key={c._id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{t?.title || 'General Work'}</span>
                              <span className="font-mono font-bold text-blue-900">{c.hours_spent} hrs</span>
                            </div>
                            <div className="text-[11px] text-slate-600">{c.description}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{p?.project_name} &middot; {c.contribution_date}</div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 4: TASKS MODULE                                              */}
          {/* ================================================================ */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Task Deliverables</h1>
                  <p className="text-xs text-slate-500 mt-1">Multi-criteria filtering by project, assigned student, status, priority, and overdue states.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingTask(null);
                    setTaskFormProjectId(projects[0]?._id || '');
                    setShowTaskModal(true);
                  }}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Task</span>
                </button>
              </div>

              {/* Filters Card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between text-xs">
                <div className="flex flex-wrap gap-3 items-center flex-1">
                  <select
                    value={taskFilterProject}
                    onChange={e => setTaskFilterProject(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="">All Projects</option>
                    {projects.map(p => (
                      <option key={p._id} value={p._id}>{p.project_name}</option>
                    ))}
                  </select>

                  <select
                    value={taskFilterMember}
                    onChange={e => setTaskFilterMember(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="">All Assignees</option>
                    {users.map(u => (
                      <option key={u._id} value={u._id}>{u.name}</option>
                    ))}
                  </select>

                  <select
                    value={taskFilterStatus}
                    onChange={e => setTaskFilterStatus(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="">All Statuses</option>
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>

                  <select
                    value={taskFilterPriority}
                    onChange={e => setTaskFilterPriority(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="">All Priorities</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>

                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 ml-2">
                    <input
                      type="checkbox"
                      checked={taskFilterOverdueOnly}
                      onChange={e => setTaskFilterOverdueOnly(e.target.checked)}
                      className="rounded text-blue-900"
                    />
                    <span>Overdue Only</span>
                  </label>
                </div>

                {(taskFilterProject || taskFilterMember || taskFilterStatus || taskFilterPriority || taskFilterOverdueOnly) && (
                  <button
                    onClick={() => {
                      setTaskFilterProject('');
                      setTaskFilterMember('');
                      setTaskFilterStatus('');
                      setTaskFilterPriority('');
                      setTaskFilterOverdueOnly(false);
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              {/* Tasks Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Task Title</th>
                      <th className="py-3 px-4">Project</th>
                      <th className="py-3 px-4">Assignee</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Deadline</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTasks.map(t => {
                      const p = projects.find(x => x._id === t.project_id);
                      const m = users.find(x => x._id === t.assigned_to);
                      const isOverdue = t.status !== 'Completed' && t.deadline < todayDateStr;

                      return (
                        <tr key={t._id} className={isOverdue ? 'bg-rose-50/50 hover:bg-rose-50' : 'hover:bg-slate-50/80 transition-colors'}>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{t.title}</div>
                            {t.description && <div className="text-[11px] text-slate-400 truncate max-w-xs">{t.description}</div>}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700">
                            {p?.project_name || 'Unknown'}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {m?.name || 'Unassigned'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              t.priority === 'High' ? 'bg-rose-100 text-rose-800' :
                              t.priority === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {t.priority}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}>{t.deadline}</span>
                            {isOverdue && <div className="text-[10px] text-rose-600 font-bold">Overdue</div>}
                            {t.status === 'Completed' && t.completion_date && (
                              <div className="text-[10px] text-emerald-700">Done: {t.completion_date}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleToggleTaskStatus(t._id)}
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                                t.status === 'Completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                t.status === 'In Progress' ? 'bg-blue-50 text-blue-900 border-blue-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {t.status}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => { setEditingTask(t); setTaskFormProjectId(t.project_id); setShowTaskModal(true); }}
                                className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(t._id)}
                                className="p-1.5 rounded hover:bg-rose-50 text-rose-600"
                                title="Delete Task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 5: CONTRIBUTIONS MODULE                                      */}
          {/* ================================================================ */}
          {activeTab === 'contributions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team Contribution Tracking</h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Granular working hours strictly aggregated from contribution documents via MongoDB $sum.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingContrib(null);
                    setContribFormProjectId(projects[0]?._id || '');
                    setContribFormUserId(projects[0]?.member_ids[0] || '');
                    setShowContribModal(true);
                  }}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log Contribution</span>
                </button>
              </div>

              {/* Aggregation Summary Cards (By Member & By Project) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Hours by Member */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900">Contribution by Member</h3>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Group by user_id</span>
                  </div>

                  <div className="space-y-2.5">
                    {report5_ContributionHoursByMember.map(m => (
                      <div key={m.user_id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{m.member_name}</span>
                          <span className="font-mono font-bold text-blue-900">{m.total_hours} hrs</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div
                            className="bg-indigo-600 h-1.5 rounded-full"
                            style={{
                              width: `${(m.total_hours / (report5_ContributionHoursByMember[0]?.total_hours || 1)) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hours by Project */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900">Contribution by Project</h3>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Group by project_id</span>
                  </div>

                  <div className="space-y-2.5">
                    {projects.map(p => {
                      const pHours = Number(contributions.filter(c => c.project_id === p._id).reduce((acc, c) => acc + c.hours_spent, 0).toFixed(1));
                      return (
                        <div key={p._id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800">{p.project_name}</span>
                            <span className="font-mono font-bold text-emerald-700">{pHours} hrs</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div
                              className="bg-emerald-600 h-1.5 rounded-full"
                              style={{ width: `${(pHours / (dashboardStats.totalHours || 1)) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Filter */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <select
                    value={contribFilterMember}
                    onChange={e => setContribFilterMember(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="">All Members</option>
                    {users.map(u => (
                      <option key={u._id} value={u._id}>{u.name}</option>
                    ))}
                  </select>

                  <select
                    value={contribFilterProject}
                    onChange={e => setContribFilterProject(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="">All Projects</option>
                    {projects.map(p => (
                      <option key={p._id} value={p._id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>

                {(contribFilterMember || contribFilterProject) && (
                  <button
                    onClick={() => { setContribFilterMember(''); setContribFilterProject(''); }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              {/* Detailed Contributions Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Member</th>
                      <th className="py-3 px-4">Project</th>
                      <th className="py-3 px-4">Related Task</th>
                      <th className="py-3 px-4">Work Description</th>
                      <th className="py-3 px-4 text-right">Hours</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredContributions.map(c => {
                      const u = users.find(x => x._id === c.user_id);
                      const p = projects.find(x => x._id === c.project_id);
                      const t = tasks.find(x => x._id === c.task_id);

                      return (
                        <tr key={c._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{c.contribution_date}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{u?.name || 'Unknown'}</td>
                          <td className="py-3 px-4 text-slate-700">{p?.project_name || 'Unknown'}</td>
                          <td className="py-3 px-4 text-slate-800 font-medium">{t?.title || 'General Work'}</td>
                          <td className="py-3 px-4 text-slate-500 max-w-sm truncate">{c.description}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-blue-900">{c.hours_spent}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => { setEditingContrib(c); setShowContribModal(true); }}
                                className="p-1 rounded text-slate-400 hover:text-slate-700"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteContribution(c._id)}
                                className="p-1 rounded text-rose-400 hover:text-rose-700"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 6: 8 MONGODB AGGREGATION REPORTS                             */}
          {/* ================================================================ */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">MongoDB Aggregation Reports &amp; Analytics</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Eight advanced analytical pipelines demonstrating $lookup, $group, $match, $unwind, $project, and $cond.
                </p>
              </div>

              {/* REPORT 1 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 bg-blue-100 px-2 py-0.5 rounded">Report 1</span>
                    <h2 className="text-sm font-bold text-slate-900 mt-1">Task Completion Percentage by Project</h2>
                    <p className="text-[11px] text-slate-500">Calculates completed &divide; total tasks using $lookup, $filter, and $cond</p>
                  </div>
                  <button
                    onClick={() => togglePipeline('rep1')}
                    className="text-xs font-semibold px-2.5 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 flex items-center gap-1"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>{pipelineExpanded['rep1'] ? 'Hide Pipeline' : 'View Pipeline Code'}</span>
                  </button>
                </div>

                {pipelineExpanded['rep1'] && (
                  <pre className="bg-slate-950 text-cyan-300 p-4 font-mono text-[11px] overflow-x-auto border-b border-slate-900">
                    {`db.projects.aggregate([
  {
    $lookup: {
      from: "tasks",
      localField: "_id",
      foreignField: "project_id",
      as: "tasks"
    }
  },
  {
    $project: {
      project_name: 1,
      status: 1,
      total_tasks: { $size: "$tasks" },
      completed_tasks: {
        $size: {
          $filter: {
            input: "$tasks",
            as: "t",
            cond: { $eq: ["$$t.status", "Completed"] }
          }
        }
      }
    }
  },
  {
    $project: {
      project_name: 1,
      status: 1,
      total_tasks: 1,
      completed_tasks: 1,
      completion_pct: {
        $cond: {
          if: { $gt: ["$total_tasks", 0] },
          then: { $multiply: [{ $divide: ["$completed_tasks", "$total_tasks"] }, 100] },
          else: 0
        }
      }
    }
  },
  { $sort: { completion_pct: -1 } }
])`}
                  </pre>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4">Project Name</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4 text-right">Total Tasks</th>
                        <th className="py-2.5 px-4 text-right">Completed Tasks</th>
                        <th className="py-2.5 px-4">Completion Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {report1_TaskCompletionByProject.map(r => (
                        <tr key={r._id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-sans font-bold text-slate-900">{r.project_name}</td>
                          <td className="py-2.5 px-4 font-sans">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{r.status}</span>
                          </td>
                          <td className="py-2.5 px-4 text-right">{r.total_tasks}</td>
                          <td className="py-2.5 px-4 text-right text-emerald-700 font-bold">{r.completed_tasks}</td>
                          <td className="py-2.5 px-4 min-w-[150px]">
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{r.completion_pct}%</span>
                              <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                                <div className="bg-blue-900 h-1.5 rounded-full" style={{ width: `${r.completion_pct}%` }}></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* REPORT 2 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900 bg-purple-100 px-2 py-0.5 rounded">Report 2</span>
                    <h2 className="text-sm font-bold text-slate-900 mt-1">Completed &amp; Pending Tasks by Team Member</h2>
                    <p className="text-[11px] text-slate-500">Outer join via $lookup from users to tasks collection</p>
                  </div>
                  <button
                    onClick={() => togglePipeline('rep2')}
                    className="text-xs font-semibold px-2.5 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 flex items-center gap-1"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>{pipelineExpanded['rep2'] ? 'Hide Pipeline' : 'View Pipeline Code'}</span>
                  </button>
                </div>

                {pipelineExpanded['rep2'] && (
                  <pre className="bg-slate-950 text-cyan-300 p-4 font-mono text-[11px] overflow-x-auto border-b border-slate-900">
                    {`db.users.aggregate([
  {
    $lookup: {
      from: "tasks",
      localField: "_id",
      foreignField: "assigned_to",
      as: "tasks"
    }
  },
  {
    $project: {
      name: 1,
      role: 1,
      total_tasks: { $size: "$tasks" },
      completed_tasks: {
        $size: {
          $filter: {
            input: "$tasks",
            as: "t",
            cond: { $eq: ["$$t.status", "Completed"] }
          }
        }
      },
      pending_tasks: {
        $size: {
          $filter: {
            input: "$tasks",
            as: "t",
            cond: { $ne: ["$$t.status", "Completed"] }
          }
        }
      }
    }
  },
  { $sort: { total_tasks: -1 } }
])`}
                  </pre>
                )}

                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Member Name</th>
                      <th className="py-2.5 px-4">Role</th>
                      <th className="py-2.5 px-4 text-right">Total Assigned</th>
                      <th className="py-2.5 px-4 text-right">Completed</th>
                      <th className="py-2.5 px-4 text-right">Pending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report2_MemberTasksSummary.map(r => (
                      <tr key={r._id} className="hover:bg-slate-50 font-mono">
                        <td className="py-2.5 px-4 font-sans font-bold text-slate-900">{r.name}</td>
                        <td className="py-2.5 px-4 font-sans text-slate-500">{r.role}</td>
                        <td className="py-2.5 px-4 text-right font-bold">{r.total_tasks}</td>
                        <td className="py-2.5 px-4 text-right text-emerald-700 font-bold">{r.completed_tasks}</td>
                        <td className="py-2.5 px-4 text-right text-blue-900 font-bold">{r.pending_tasks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* REPORT 3 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-900 bg-rose-100 px-2 py-0.5 rounded">Report 3</span>
                    <h2 className="text-sm font-bold text-slate-900 mt-1">Overdue Tasks with Project &amp; Member Details</h2>
                    <p className="text-[11px] text-slate-500">Filtered using $match with date &lt; today and status != Completed</p>
                  </div>
                  <button
                    onClick={() => togglePipeline('rep3')}
                    className="text-xs font-semibold px-2.5 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 flex items-center gap-1"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>{pipelineExpanded['rep3'] ? 'Hide Pipeline' : 'View Pipeline Code'}</span>
                  </button>
                </div>

                {pipelineExpanded['rep3'] && (
                  <pre className="bg-slate-950 text-cyan-300 p-4 font-mono text-[11px] overflow-x-auto border-b border-slate-900">
                    {`db.tasks.aggregate([
  {
    $match: {
      status: { $ne: "Completed" },
      deadline: { $lt: "${todayDateStr}" }
    }
  },
  {
    $lookup: {
      from: "projects",
      localField: "project_id",
      foreignField: "_id",
      as: "project"
    }
  },
  {
    $lookup: {
      from: "users",
      localField: "assigned_to",
      foreignField: "_id",
      as: "member"
    }
  },
  {
    $project: {
      title: 1,
      deadline: 1,
      priority: 1,
      status: 1,
      project_name: { $arrayElemAt: ["$project.project_name", 0] },
      member_name: { $arrayElemAt: ["$member.name", 0] }
    }
  },
  { $sort: { deadline: 1 } }
])`}
                  </pre>
                )}

                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Task Deliverable</th>
                      <th className="py-2.5 px-4">Project</th>
                      <th className="py-2.5 px-4">Assigned Member</th>
                      <th className="py-2.5 px-4">Priority</th>
                      <th className="py-2.5 px-4">Deadline</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report3_OverdueTasks.map(r => (
                      <tr key={r._id} className="bg-rose-50/30 hover:bg-rose-50/70">
                        <td className="py-2.5 px-4 font-bold text-slate-900">{r.title}</td>
                        <td className="py-2.5 px-4 text-slate-600">{r.project_name}</td>
                        <td className="py-2.5 px-4 text-slate-800 font-medium">{r.member_name}</td>
                        <td className="py-2.5 px-4">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800">{r.priority}</span>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-rose-600">{r.deadline}</td>
                        <td className="py-2.5 px-4">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">{r.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* REPORT 4 & 5 SPLIT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* REPORT 4 */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded">Report 4</span>
                      <h2 className="text-sm font-bold text-slate-900 mt-1">Workload Distribution</h2>
                      <p className="text-[11px] text-slate-500">Active assigned tasks via $group stage</p>
                    </div>
                    <button onClick={() => togglePipeline('rep4')} className="text-xs font-semibold px-2.5 py-1 rounded bg-white border border-slate-200">
                      Pipeline
                    </button>
                  </div>
                  {pipelineExpanded['rep4'] && (
                    <pre className="bg-slate-950 text-cyan-300 p-3 font-mono text-[10px] overflow-x-auto">
                      {`db.tasks.aggregate([
  { $match: { status: { $ne: "Completed" } } },
  { $group: { _id: "$assigned_to", active_task_count: { $sum: 1 } } },
  { $sort: { active_task_count: -1 } }
])`}
                    </pre>
                  )}
                  <div className="p-4 space-y-3">
                    {report4_WorkloadDistribution.map(r => (
                      <div key={r.user_id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{r.member_name} ({r.role})</span>
                          <span className="font-mono font-bold text-slate-900">{r.active_task_count} tasks</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div
                            className="bg-purple-600 h-1.5 rounded-full"
                            style={{ width: `${(r.active_task_count / (report4_WorkloadDistribution[0]?.active_task_count || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* REPORT 5 */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded">Report 5</span>
                      <h2 className="text-sm font-bold text-slate-900 mt-1">Total Contribution Hours</h2>
                      <p className="text-[11px] text-slate-500">Sum of hours_spent from contributions</p>
                    </div>
                    <button onClick={() => togglePipeline('rep5')} className="text-xs font-semibold px-2.5 py-1 rounded bg-white border border-slate-200">
                      Pipeline
                    </button>
                  </div>
                  {pipelineExpanded['rep5'] && (
                    <pre className="bg-slate-950 text-cyan-300 p-3 font-mono text-[10px] overflow-x-auto">
                      {`db.contributions.aggregate([
  { $group: { _id: "$user_id", total_hours: { $sum: "$hours_spent" } } },
  { $sort: { total_hours: -1 } }
])`}
                    </pre>
                  )}
                  <div className="p-4 space-y-3">
                    {report5_ContributionHoursByMember.map(r => (
                      <div key={r.user_id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{r.member_name}</span>
                          <span className="font-mono font-bold text-blue-900">{r.total_hours} hrs</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div
                            className="bg-blue-800 h-1.5 rounded-full"
                            style={{ width: `${(r.total_hours / (report5_ContributionHoursByMember[0]?.total_hours || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* REPORT 6, 7 & 8 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* REPORT 7: Members with No Tasks */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
                  <div className="pb-2 border-b border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Report 7</span>
                    <h4 className="text-xs font-bold text-slate-900">Members With No Tasks</h4>
                  </div>
                  {report7_MembersWithoutTasks.length === 0 ? (
                    <div className="text-xs text-emerald-700 font-medium py-3">✓ All members have assigned tasks.</div>
                  ) : (
                    report7_MembersWithoutTasks.map(m => (
                      <div key={m._id} className="text-xs p-2 bg-slate-50 rounded border border-slate-100">
                        <div className="font-bold text-slate-900">{m.name}</div>
                        <div className="text-[11px] text-slate-500">{m.role}</div>
                      </div>
                    ))
                  )}
                </div>

                {/* REPORT 8: Approaching Deadlines */}
                <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
                  <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-amber-700">Report 8</span>
                      <h4 className="text-xs font-bold text-slate-900">Tasks Approaching Deadlines (Next 7 Days)</h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Range: today &rarr; today+7</span>
                  </div>

                  <div className="space-y-2">
                    {report8_TasksApproachingDeadlines.length === 0 ? (
                      <div className="text-xs text-slate-400 py-3">No tasks due in the next 7 days.</div>
                    ) : (
                      report8_TasksApproachingDeadlines.map(t => (
                        <div key={t._id} className="p-2.5 rounded bg-amber-50/50 border border-amber-200 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-slate-900">{t.title}</div>
                            <div className="text-[11px] text-slate-500">{t.project_name} &middot; Assignee: {t.member_name}</div>
                          </div>
                          <span className="font-mono font-bold text-amber-800">{t.deadline}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 7: AUDIT & ACTIVITY HISTORY                                  */}
          {/* ================================================================ */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Audit &amp; Activity History</h1>
                <p className="text-xs text-slate-500 mt-1">Complete chronological audit trail recorded to the activity_logs collection.</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100">
                {activityLogs.map(log => {
                  const p = projects.find(x => x._id === log.project_id);
                  const u = users.find(x => x._id === log.user_id);

                  return (
                    <div key={log._id} className="p-4 flex items-start gap-4 hover:bg-slate-50/60 transition-colors">
                      <div className="w-36 shrink-0">
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {log.action_type}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-slate-900">{log.description}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-1 flex items-center gap-2">
                          {u && <span>Actor: <strong>{u.name}</strong></span>}
                          {p && <span>&middot; Project: <strong>{p.project_name}</strong></span>}
                          <span>&middot; {log.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 8: DBMS VIVA EXAMINATION PREPARATION & WINDOWS GUIDE         */}
          {/* ================================================================ */}
          {activeTab === 'viva_guide' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">DBMS Viva Preparation &amp; Windows 10/11 Guide</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Complete viva examination questions, MongoDB theory, schema explanation, and exact local terminal commands.
                </p>
              </div>

              {/* Windows 10/11 Execution Cheatsheet */}
              <div className="bg-slate-900 text-slate-100 rounded-xl p-5 space-y-4 shadow-md">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                  <Terminal className="w-4 h-4" />
                  <span>Windows 10/11 Setup Commands (Zero Passwords Required)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold font-sans">1. Start MongoDB Service</span>
                    <code className="text-emerald-400 select-all">net start MongoDB</code>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold font-sans">2. Create Virtual Environment</span>
                    <code className="text-emerald-400 select-all">python -m venv venv</code>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold font-sans">3. Activate in PowerShell</span>
                    <code className="text-emerald-400 select-all">.\venv\Scripts\Activate.ps1</code>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold font-sans">4. Install PyMongo &amp; Flask</span>
                    <code className="text-emerald-400 select-all">pip install -r requirements.txt</code>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold font-sans">5. Build MongoDB Indexes</span>
                    <code className="text-emerald-400 select-all">python database/setup_indexes.py</code>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold font-sans">6. Import Realistic Sample Data</span>
                    <code className="text-emerald-400 select-all">python database/sample_data.py</code>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 md:col-span-2">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold font-sans">7. Start Flask Server (http://127.0.0.1:5000)</span>
                    <code className="text-emerald-400 select-all font-bold">python app.py</code>
                  </div>
                </div>
              </div>

              {/* DBMS Viva Flashcards & Answers */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900">Key DBMS Viva Questions &amp; Model Answers</h3>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                  <h4 className="font-bold text-sm text-blue-900">Q1: What is MongoDB and how does it differ from traditional Relational Databases (RDBMS)?</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    MongoDB is a document-oriented NoSQL database that stores data in flexible, schema-free BSON documents instead of rigid relational tables.
                    In SQL, data normalization splits information across dozens of tables requiring complex multi-table JOINs at read time. In MongoDB,
                    related data can either be embedded directly (e.g. skills inside user documents) or referenced via ObjectIds ($lookup joins) based on domain access patterns.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                  <h4 className="font-bold text-sm text-blue-900">Q2: What is an ObjectId and what does its 12-byte structure consist of?</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-mono">
                    ObjectId is a 12-byte BSON primary key:
                    <br />&bull; 4 bytes: Unix epoch timestamp representing exact creation time
                    <br />&bull; 5 bytes: Machine identifier and process ID
                    <br />&bull; 3 bytes: Monotonically incrementing counter
                    <br />This guarantees global uniqueness without needing a centralized auto-increment counter like SQL sequences.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                  <h4 className="font-bold text-sm text-blue-900">Q3: Why are six collections used in MergeMate?</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    1. <strong>users:</strong> Independent entity for students and technical skill profiles.
                    <br />2. <strong>projects:</strong> Deliverable entities with discrete start dates and deadlines.
                    <br />3. <strong>project_members:</strong> Junction collection with a compound unique index on (project_id, user_id). Decouples project assignment so removing a member does not accidentally wipe historical tasks or contributions.
                    <br />4. <strong>tasks:</strong> Discrete unit of work with status and priority lifecycle.
                    <br />5. <strong>contributions:</strong> Granular time-tracking log. Hours are strictly aggregated from here rather than fake counters.
                    <br />6. <strong>activity_logs:</strong> Append-only chronological audit ledger for team transparency.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                  <h4 className="font-bold text-sm text-blue-900">Q4: What is the MongoDB Aggregation Pipeline and which stages did you use?</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    The aggregation pipeline processes documents through multi-stage transforms:
                    <br />&bull; <strong>$match:</strong> Filters documents (e.g. overdue tasks where deadline &lt; today and status != Completed).
                    <br />&bull; <strong>$lookup:</strong> Performs left-outer join between collections (e.g. joining tasks to users to fetch assignee names).
                    <br />&bull; <strong>$group:</strong> Groups documents by a key and computes accumulators like $sum on hours_spent.
                    <br />&bull; <strong>$project:</strong> Reshapes fields and computes completion percentages using $cond.
                    <br />&bull; <strong>$sort:</strong> Sorts outputs chronologically or by progress.
                  </p>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ==================================================================== */}
      {/* MODALS: CREATE / EDIT PROJECT                                         */}
      {/* ==================================================================== */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingProject ? 'Edit Project Details' : 'Create New Team Project'}
              </h2>
              <button onClick={() => setShowProjectModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Project Name *</label>
                <input
                  type="text"
                  name="project_name"
                  defaultValue={editingProject?.project_name || ''}
                  required
                  placeholder="e.g. Smart Campus Transit Portal"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingProject?.description || ''}
                  placeholder="Explain the project objectives and student scope..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-900"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Start Date *</label>
                  <input
                    type="date"
                    name="start_date"
                    defaultValue={editingProject?.start_date || todayDateStr}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Deadline *</label>
                  <input
                    type="date"
                    name="deadline"
                    defaultValue={editingProject?.deadline || ''}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status *</label>
                  <select
                    name="status"
                    defaultValue={editingProject?.status || 'In Progress'}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Project Lead *</label>
                  <select
                    name="project_lead"
                    defaultValue={editingProject?.project_lead || users[0]?._id}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    {users.map(u => (
                      <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold bg-blue-900 hover:bg-blue-950 text-white rounded-lg shadow-xs"
                >
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODALS: CREATE / EDIT TEAM MEMBER                                    */}
      {/* ==================================================================== */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingMember ? 'Edit Member Profile' : 'Register New Team Member'}
              </h2>
              <button onClick={() => setShowMemberModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingMember?.name || ''}
                  required
                  placeholder="e.g. Sneha Rao"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">College Email Address *</label>
                <input
                  type="email"
                  name="email"
                  defaultValue={editingMember?.email || ''}
                  required
                  placeholder="e.g. sneha.rao@college.edu"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
                <span className="text-[10px] text-slate-400">Must be unique (enforced by MongoDB unique index).</span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Role in Team *</label>
                <input
                  type="text"
                  name="role"
                  defaultValue={editingMember?.role || ''}
                  required
                  placeholder="e.g. UI/UX Designer &amp; Frontend Lead"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Skills (Comma-separated)</label>
                <input
                  type="text"
                  name="skills"
                  defaultValue={editingMember?.skills.join(', ') || ''}
                  placeholder="e.g. HTML5, CSS3, JavaScript, Python"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
                <span className="text-[10px] text-slate-400">Stored as a BSON array in MongoDB.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold bg-blue-900 hover:bg-blue-950 text-white rounded-lg shadow-xs"
                >
                  {editingMember ? 'Save Changes' : 'Register Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODALS: CREATE / EDIT TASK                                           */}
      {/* ==================================================================== */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingTask ? 'Edit Task Deliverable' : 'Create Project Task'}
              </h2>
              <button onClick={() => setShowTaskModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Task Title *</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingTask?.title || ''}
                  required
                  placeholder="e.g. Design MongoDB Aggregation Pipelines"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingTask?.description || ''}
                  placeholder="Implementation notes and acceptance criteria..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Project *</label>
                  <select
                    name="project_id"
                    value={taskFormProjectId}
                    onChange={e => setTaskFormProjectId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    {projects.map(p => (
                      <option key={p._id} value={p._id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assigned Member *</label>
                  <select
                    name="assigned_to"
                    defaultValue={editingTask?.assigned_to || ''}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="">Select Member</option>
                    {membersInTaskFormProject.map(m => (
                      <option key={m._id} value={m._id}>{m.name} ({m.role})</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400">Strictly filtered to project members.</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Priority *</label>
                  <select
                    name="priority"
                    defaultValue={editingTask?.priority || 'Medium'}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status *</label>
                  <select
                    name="status"
                    defaultValue={editingTask?.status || 'To Do'}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Start Date *</label>
                  <input
                    type="date"
                    name="start_date"
                    defaultValue={editingTask?.start_date || todayDateStr}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Deadline *</label>
                  <input
                    type="date"
                    name="deadline"
                    defaultValue={editingTask?.deadline || ''}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold bg-blue-900 hover:bg-blue-950 text-white rounded-lg shadow-xs"
                >
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODALS: CREATE / EDIT CONTRIBUTION                                   */}
      {/* ==================================================================== */}
      {showContribModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingContrib ? 'Edit Contribution Record' : 'Log Team Contribution'}
              </h2>
              <button onClick={() => setShowContribModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContribution} className="space-y-3.5 text-xs">
              {!editingContrib && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Project *</label>
                      <select
                        value={contribFormProjectId}
                        onChange={e => {
                          setContribFormProjectId(e.target.value);
                          setContribFormUserId('');
                        }}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="">Select Project</option>
                        {projects.map(p => (
                          <option key={p._id} value={p._id}>{p.project_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Team Member *</label>
                      <select
                        value={contribFormUserId}
                        onChange={e => setContribFormUserId(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="">Select Member</option>
                        {membersInContribProject.map(m => (
                          <option key={m._id} value={m._id}>{m.name} ({m.role})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Related Assigned Task *</label>
                    <select
                      name="task_id"
                      required
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="">Select Related Task</option>
                      {tasksForContribMember.map(t => (
                        <option key={t._id} value={t._id}>{t.title} ({t.status})</option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-400">Strictly filtered to tasks assigned to this member in this project.</span>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hours Spent *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    name="hours_spent"
                    defaultValue={editingContrib?.hours_spent || ''}
                    required
                    placeholder="e.g. 4.5"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Positive decimal (e.g., 2.5, 4.0, 6.5).</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Contribution Date *</label>
                  <input
                    type="date"
                    name="contribution_date"
                    defaultValue={editingContrib?.contribution_date || todayDateStr}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Work Description *</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingContrib?.description || ''}
                  required
                  placeholder="Describe the research, implementation, code review, or testing performed..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowContribModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold bg-blue-900 hover:bg-blue-950 text-white rounded-lg shadow-xs"
                >
                  {editingContrib ? 'Save Changes' : 'Log Hours'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
