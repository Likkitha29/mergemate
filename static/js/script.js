/**
 * MergeMate — Vanilla JavaScript Interactions
 * Handles dynamic cascading dropdowns, form validations, pipeline toggles,
 * and responsive mobile navigation.
 */

document.addEventListener('DOMContentLoaded', () => {
  initSidebarToggle();
  initDynamicTaskForm();
  initDynamicContributionForm();
  initDateValidation();
});

/**
 * 1. Mobile Sidebar Navigation Toggle
 */
function initSidebarToggle() {
  const toggleBtn = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
    });

    // Close when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && sidebar.classList.contains('mobile-open')) {
        if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
          sidebar.classList.remove('mobile-open');
        }
      }
    });
  }
}

/**
 * 2. Dynamic Member Dropdown for Task Form
 * When a user selects a project, load only members belonging to that project.
 */
function initDynamicTaskForm() {
  const projectSelect = document.getElementById('task_project_select');
  const memberSelect = document.getElementById('task_member_select');

  if (!projectSelect || !memberSelect) return;

  const currentAssignee = memberSelect.getAttribute('data-current-assignee') || '';

  const updateMembers = async (projectId) => {
    if (!projectId) {
      memberSelect.innerHTML = '<option value="">Select Project First</option>';
      return;
    }

    memberSelect.innerHTML = '<option value="">Loading project members...</option>';

    try {
      const res = await fetch(`/api/project-members/${projectId}`);
      const members = await res.json();

      if (members.length === 0) {
        memberSelect.innerHTML = '<option value="">No members assigned to this project</option>';
        return;
      }

      let options = '<option value="">Select Team Member</option>';
      members.forEach((m) => {
        const isSelected = m._id === currentAssignee ? 'selected' : '';
        options += `<option value="${m._id}" ${isSelected}>${m.name} (${m.role})</option>`;
      });

      memberSelect.innerHTML = options;
    } catch (err) {
      console.error('Error fetching project members:', err);
      memberSelect.innerHTML = '<option value="">Error loading members</option>';
    }
  };

  projectSelect.addEventListener('change', (e) => {
    updateMembers(e.target.value);
  });

  // If already selected on load (e.g. edit mode or preselected)
  if (projectSelect.value) {
    updateMembers(projectSelect.value);
  }
}

/**
 * 3. Dynamic Member & Task Cascade for Contribution Form
 * Step 1: Project -> Loads Members assigned to project
 * Step 2: Member -> Loads Tasks assigned to that member in that project
 */
function initDynamicContributionForm() {
  const projectSelect = document.getElementById('contrib_project_select');
  const memberSelect = document.getElementById('contrib_member_select');
  const taskSelect = document.getElementById('contrib_task_select');

  if (!projectSelect || !memberSelect || !taskSelect) return;

  projectSelect.addEventListener('change', async (e) => {
    const projectId = e.target.value;
    taskSelect.innerHTML = '<option value="">Select Member First</option>';

    if (!projectId) {
      memberSelect.innerHTML = '<option value="">Select Project First</option>';
      return;
    }

    memberSelect.innerHTML = '<option value="">Loading members...</option>';

    try {
      const res = await fetch(`/api/project-members/${projectId}`);
      const members = await res.json();

      if (members.length === 0) {
        memberSelect.innerHTML = '<option value="">No members in this project</option>';
        return;
      }

      let options = '<option value="">Select Member</option>';
      members.forEach((m) => {
        options += `<option value="${m._id}">${m.name} (${m.role})</option>`;
      });
      memberSelect.innerHTML = options;
    } catch (err) {
      memberSelect.innerHTML = '<option value="">Error loading members</option>';
    }
  });

  memberSelect.addEventListener('change', async (e) => {
    const projectId = projectSelect.value;
    const memberId = e.target.value;

    if (!projectId || !memberId) {
      taskSelect.innerHTML = '<option value="">Select Member First</option>';
      return;
    }

    taskSelect.innerHTML = '<option value="">Loading assigned tasks...</option>';

    try {
      const res = await fetch(`/api/member-tasks/${projectId}/${memberId}`);
      const tasks = await res.json();

      if (tasks.length === 0) {
        taskSelect.innerHTML = '<option value="">No tasks assigned to this member in this project</option>';
        return;
      }

      let options = '<option value="">Select Related Task</option>';
      tasks.forEach((t) => {
        options += `<option value="${t._id}">${t.title} (${t.status})</option>`;
      });
      taskSelect.innerHTML = options;
    } catch (err) {
      taskSelect.innerHTML = '<option value="">Error loading tasks</option>';
    }
  });
}

/**
 * 4. Client-Side Date Validation
 * Ensures deadline is not earlier than start date on all forms.
 */
function initDateValidation() {
  const forms = [document.getElementById('projectForm'), document.getElementById('taskForm')];

  forms.forEach((form) => {
    if (!form) return;

    form.addEventListener('submit', (e) => {
      const startDateInput = form.querySelector('[name="start_date"]');
      const deadlineInput = form.querySelector('[name="deadline"]');

      if (startDateInput && deadlineInput && startDateInput.value && deadlineInput.value) {
        if (deadlineInput.value < startDateInput.value) {
          e.preventDefault();
          alert('Validation Error: The deadline date cannot be earlier than the start date.');
          deadlineInput.focus();
        }
      }
    });
  });
}

/**
 * 5. Report Aggregation Pipeline Code Viewers
 */
function togglePipeline(blockId) {
  const block = document.getElementById(blockId);
  if (block) {
    block.style.display = block.style.display === 'none' ? 'block' : 'none';
  }
}

function toggleAllPipelines() {
  const blocks = document.querySelectorAll('.pipeline-code-block');
  const shouldOpen = Array.from(blocks).some((b) => b.style.display === 'none');
  blocks.forEach((b) => {
    b.style.display = shouldOpen ? 'block' : 'none';
  });
}
