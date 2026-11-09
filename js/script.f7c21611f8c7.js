document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { page: "dashboard", sort: "name", direction: "asc", editingId: null, studentPage: 1, pageSize: 7 };
  const pageTitles = {
    dashboard: ["Dashboard", "Manage and track student information easily."],
    students: ["Students", "Search, review and manage your student records."],
    add: ["Add Student", "Create a detailed student profile."],
    attendance: ["Attendance", "Track daily presence and attendance history."],
    courses: ["Courses", "Manage courses, departments and enrollment."],
    examinations: ["Examinations", "Schedule exams and enter student results."],
    results: ["Results", "Review examination marks, grades and pass status."],
    fees: ["Fees Management", "Monitor payments, balances and receipts."],
    reports: ["Reports & Analytics", "Understand student and institutional performance."],
    notifications: ["Notifications", "Stay informed about important activity."],
    settings: ["Settings", "Manage institution preferences and data backups."],
    about: ["About Project", "Learn about the Scholar Student Management Portal."]
  };
  const localDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
  const students = () => StudentModel.getAll();
  function deleteStudentRecord(id) {
    const removed = StudentModel.deleteStudent(id);
    if (removed) {
      Attendance.removeForStudent(id);
      Fees.removeForStudent(id);
      Examinations.removeStudentMarks(id);
    }
    return removed;
  }
  const money = (amount) => new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0
  }).format(Number(amount) || 0);
  const statusBadge = (status) => `<span class="badge ${status === "Active" ? "" : "badge--inactive"}">${escapeHtml(status)}</span>`;
  const gradeBadge = (grade) => `<span class="grade-pill ${grade === "F" ? "grade-pill--fail" : ""}">${escapeHtml(grade)}</span>`;
  const toast = (message, type = "success") => {
    const item = document.createElement("div");
    item.className = `toast toast--${type}`;
    item.textContent = message;
    $("#toast-container").appendChild(item);
    setTimeout(() => item.remove(), 3400);
  };

  function navigate(page) {
    if (!pageTitles[page]) return;
    state.page = page;
    $$(".page").forEach((section) => section.classList.toggle("active", section.id === `page-${page}`));
    $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.page === page));
    $("#page-title").textContent = pageTitles[page][0];
    $("#page-subtitle").textContent = pageTitles[page][1];
    $("#sidebar").classList.remove("open");
    $("#sidebar-scrim").classList.remove("visible");
    if (page === "dashboard") renderDashboard();
    if (page === "students") renderStudents();
    if (page === "attendance") renderAttendance();
    if (page === "courses") renderCourses();
    if (page === "examinations") renderExaminations();
    if (page === "results") renderResults();
    if (page === "fees") renderFees();
    if (page === "reports") renderReports();
    if (page === "notifications") renderNotifications();
    if (page === "settings") renderSettings();
    if (page === "add" && !state.editingId) resetStudentForm();
  }

  function showModal(title, body, footer = "") {
    $("#modal-title").textContent = title;
    $("#view-modal-body").innerHTML = body;
    $("#modal-footer").innerHTML = footer;
    $("#view-modal-overlay").hidden = false;
  }
  function closeModal() { $("#view-modal-overlay").hidden = true; }
  function setSelectOptions(select, values, firstLabel = "All Courses") {
    if (!select) return;
    const selected = select.value || "All";
    select.innerHTML = `<option value="All">${escapeHtml(firstLabel)}</option>` + values.map((value) =>
      `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
    if (values.includes(selected)) select.value = selected;
  }

  function renderDashboard() {
    const list = students();
    const stats = Dashboard.getStats(list);
    const attendanceEntries = Attendance.all();
    const feeRecords = list.map((student) => Fees.forStudent(student.id));
    const pendingFees = feeRecords.reduce((sum, fee) => sum + Math.max(0, fee.total - fee.paid), 0);
    const feeSummary = Fees.getSummary();
    const attendanceValue = attendanceEntries.length
      ? Math.round(attendanceEntries.filter((entry) => entry.status !== "Absent").length / attendanceEntries.length * 100)
      : (list.length ? Math.round(list.reduce((sum, student) => sum + student.attendance, 0) / list.length) : 0);
    animateCount($("#stat-total"), stats.total);
    animateCount($("#stat-active"), stats.active);
    animateCount($("#stat-passed"), stats.passed);
    animateCount($("#stat-failed"), stats.failed);
    $("#stat-pending-fees").textContent = pendingFees.toLocaleString("en-IN");
    animateCount($("#stat-avg"), stats.avgMarks, 1);
    animateCount($("#stat-attendance"), attendanceValue);
    animateCount($("#stat-courses"), Courses.all().length || Dashboard.getCourseDistribution(list).length);
    $("#today-date").textContent = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });

    const courses = Dashboard.getCourseDistribution(list);
    const maxCount = Math.max(1, ...courses.map((course) => course.count));
    $("#enrollment-chart").innerHTML = courses.length ? courses.slice(0, 8).map((course) =>
      `<div class="chart-column"><span class="chart-column__value">${course.count}</span><div class="chart-column__bar" style="height:${Math.max(7, course.count / maxCount * 75)}%"></div><span class="chart-column__label">${escapeHtml(shortLabel(course.course))}</span></div>`).join("")
      : '<p class="muted">Add students to see enrollment data.</p>';

    const grades = Dashboard.getGradeDistribution(list);
    const maxGrade = Math.max(1, ...grades.map((grade) => grade.count));
    $("#grade-chart").innerHTML = grades.map((grade) =>
      `<div class="grade-column"><strong>${grade.count}</strong><div class="grade-column__bar" style="height:${Math.max(4, grade.count / maxGrade * 70)}%"></div><small>${escapeHtml(grade.grade)}</small></div>`).join("");

    const attendanceByDay = Array.from({ length: 12 }, (_, index) => {
      const month = new Date().getMonth() - 11 + index;
      const date = new Date(new Date().getFullYear(), month, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthRecords = attendanceEntries.filter((record) => record.date.startsWith(monthKey));
      const percent = monthRecords.length
        ? Math.round(monthRecords.filter((record) => record.status !== "Absent").length / monthRecords.length * 100)
        : 0;
      return { label: date.toLocaleDateString(undefined, { month: "short" }), percent };
    });
    $("#attendance-chart").innerHTML = attendanceEntries.length ? attendanceByDay.map((day) =>
      `<div class="attendance-day"><span class="muted">${day.percent}%</span><div class="attendance-day__bar" style="height:${Math.max(5, day.percent * .65)}%"></div><small>${day.label}</small></div>`).join("")
      : '<p class="chart-empty-state">No attendance history yet. Mark attendance to see monthly trends.</p>';

    $("#course-summary").innerHTML = courses.length ? courses.slice(0, 5).map((course) =>
      `<div class="course-summary__row"><strong>${escapeHtml(course.course)}</strong><span>${course.count} student${course.count === 1 ? "" : "s"}</span><div class="course-summary__track"><i style="width:${Math.round(course.count / Math.max(1, list.length) * 100)}%"></i></div></div>`).join("")
      : '<p class="muted">No course enrollments yet.</p>';

    const recent = Dashboard.getRecent(list, 5);
    $("#recent-empty").hidden = recent.length > 0;
    $("#recent-students-body").innerHTML = recent.map((student) => `<tr>
      <td>${studentCell(student)}</td><td>${escapeHtml(student.roll)}</td><td>${escapeHtml(student.course)}</td>
      <td>${student.marks} / 100</td><td>${statusBadge(student.status)}</td></tr>`).join("");
    const exams = Examinations.all().filter((exam) => exam.date >= localDate()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
    $("#upcoming-exams").innerHTML = exams.length ? exams.map((exam) =>
      `<div class="upcoming-item"><div class="upcoming-item__date">${new Date(`${exam.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div><div><strong>${escapeHtml(exam.name)}</strong><small>${escapeHtml(exam.subject)} · ${escapeHtml(exam.course)}</small></div></div>`).join("")
      : '<p class="muted">No upcoming examinations. Add an exam to get started.</p>';
    $("#recent-activity").innerHTML = Notifications.all().slice(0, 4).map((item) =>
      `<div class="timeline-item"><span class="timeline-item__dot"></span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.message)}</p><small>${new Date(item.date).toLocaleDateString()}</small></div></div>`).join("")
      || '<p class="muted">No recent activity.</p>';
    renderBars($("#dashboard-fees"), [
      { label: "Collected", value: money(feeSummary.paid), percent: feeSummary.total ? feeSummary.paid / feeSummary.total * 100 : 0, color: "bar-fill--green" },
      { label: "Outstanding", value: money(feeSummary.pending), percent: feeSummary.total ? feeSummary.pending / feeSummary.total * 100 : 0, color: "bar-fill--amber" }
    ]);
    $("#notification-count").textContent = Notifications.unreadCount();
    $(".notification-button i").style.display = Notifications.unreadCount() ? "block" : "none";
  }

  function animateCount(element, value, decimals = 0) {
    const start = Number.parseFloat(element.textContent) || 0;
    const end = Number(value) || 0;
    const startedAt = performance.now();
    const duration = 420;
    function tick(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      element.textContent = (start + (end - start) * eased).toFixed(decimals).replace(/\.0$/, "");
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function shortLabel(text) { return text.length > 10 ? `${text.slice(0, 9)}…` : text; }
  function studentCell(student) {
    const initials = student.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
    const avatar = student.photo
      ? `<span class="student-avatar"><img src="${escapeHtml(student.photo)}" alt="" onerror="this.remove()">${escapeHtml(initials)}</span>`
      : `<span class="student-avatar">${escapeHtml(initials)}</span>`;
    return `<span class="student-cell">${avatar}<span><strong>${escapeHtml(student.name)}</strong><small>${escapeHtml(student.id)}</small></span></span>`;
  }

  function populateStudentOptions() {
    const courses = StudentModel.getCourses();
    setSelectOptions($("#filter-course"), courses);
    setSelectOptions($("#attendance-course"), courses);
    const dataList = $("#course-suggestions");
    dataList.innerHTML = Courses.all().map((course) => `<option value="${escapeHtml(course.name)}"></option>`).join("")
      + courses.filter((course) => !Courses.all().some((item) => item.name === course)).map((course) => `<option value="${escapeHtml(course)}"></option>`).join("");
  }

  function filteredStudents() {
    let list = StudentModel.search($("#search-input").value, students());
    list = StudentModel.filterByCourse($("#filter-course").value, list);
    list = StudentModel.filterByStatus($("#filter-status").value, list);
    return StudentModel.sortBy(list, state.sort, state.direction);
  }

  function renderStudents() {
    populateStudentOptions();
    const list = filteredStudents();
    const pages = Math.max(1, Math.ceil(list.length / state.pageSize));
    state.studentPage = Math.min(state.studentPage, pages);
    const pageRows = list.slice((state.studentPage - 1) * state.pageSize, state.studentPage * state.pageSize);
    $("#students-empty").hidden = list.length > 0;
    $("#students-body").innerHTML = pageRows.map((student) => `<tr>
      <td><input type="checkbox" class="student-select" value="${escapeHtml(student.id)}" aria-label="Select ${escapeHtml(student.name)}" /></td>
      <td>${studentCell(student)}</td><td>${escapeHtml(student.roll)}</td><td>${escapeHtml(student.course)}</td>
      <td>${escapeHtml(student.semester)}</td><td>${student.marks}</td><td>${gradeBadge(StudentModel.calculateGrade(student.marks))}</td>
      <td>${student.attendance}%</td><td>${statusBadge(student.status)}</td>
      <td><div class="table-actions"><button class="action-button" data-action="view-student" data-id="${escapeHtml(student.id)}" title="View profile" aria-label="View profile">◉</button><button class="action-button" data-action="edit-student" data-id="${escapeHtml(student.id)}" title="Edit student" aria-label="Edit student">✎</button><button class="action-button action-button--delete" data-action="delete-student" data-id="${escapeHtml(student.id)}" title="Delete student" aria-label="Delete student">×</button></div></td>
    </tr>`).join("");
    $("#student-count").textContent = `${list.length} student${list.length === 1 ? "" : "s"} found`;
    $("#page-indicator").textContent = `Page ${state.studentPage} of ${pages}`;
    $("#page-prev").disabled = state.studentPage <= 1;
    $("#page-next").disabled = state.studentPage >= pages;
    $("#select-all-students").checked = pageRows.length > 0 && pageRows.every((student) => $$(".student-select").some((input) => input.value === student.id && input.checked));
    updateBulkButton();
  }

  function updateBulkButton() {
    const count = $$(".student-select:checked").length;
    $("#bulk-delete-btn").disabled = count === 0;
    $("#bulk-delete-btn").textContent = count ? `Delete selected (${count})` : "Delete selected";
  }

  function resetStudentForm() {
    state.editingId = null;
    $("#student-form").reset();
    $("#student-id").value = "";
    $("#f-student-code").value = StudentModel.getNextId();
    $("#f-student-code").readOnly = false;
    $("#form-title").textContent = "Add New Student";
    $("#form-submit-btn").textContent = "Save Student";
    $("#grade-preview").textContent = "—";
    $$(".field__error").forEach((item) => item.textContent = "");
    $$(".input--invalid").forEach((item) => item.classList.remove("input--invalid"));
    populateStudentOptions();
  }

  function editStudent(id) {
    const student = StudentModel.getById(id);
    if (!student) return toast("Student record was not found.", "error");
    state.editingId = id;
    const fields = {
      "student-id": "id", "f-student-code": "id", "f-roll": "roll", "f-name": "name", "f-email": "email", "f-phone": "phone",
      "f-gender": "gender", "f-dob": "dob", "f-address": "address", "f-city": "city", "f-state": "state", "f-photo": "photo",
      "f-guardian": "guardian", "f-guardian-phone": "guardianPhone", "f-relationship": "relationship", "f-course": "course",
      "f-department": "department", "f-semester": "semester", "f-admission": "admissionDate",
      "f-marks": "marks", "f-attendance": "attendance", "f-status": "status"
    };
    Object.entries(fields).forEach(([elementId, field]) => { $(`#${elementId}`).value = student[field] ?? ""; });
    $("#f-student-code").readOnly = true;
    $("#form-title").textContent = `Edit Student — ${student.name}`;
    $("#form-submit-btn").textContent = "Update Student";
    updateGradePreview();
    navigate("add");
  }

  function viewStudent(id) {
    const student = StudentModel.getById(id);
    if (!student) return;
    const attendance = Attendance.getPercentage(id);
    const fees = Fees.forStudent(id);
    const rows = [
      ["Student ID", student.id], ["Roll Number", student.roll], ["Full Name", student.name], ["Email", student.email],
      ["Phone", student.phone], ["Gender", student.gender || "—"], ["Date of Birth", student.dob || "—"],
      ["Address", [student.address, student.city, student.state].filter(Boolean).join(", ") || "—"], ["Course", student.course], ["Department", student.department || "—"],
      ["Semester / Class", student.semester], ["Admission Date", student.admissionDate || "—"],
      ["Guardian", student.guardian || "—"], ["Guardian Phone", student.guardianPhone || "—"], ["Relationship", student.relationship || "—"],
      ["Marks / Grade", `${student.marks} / 100 · ${StudentModel.calculateGrade(student.marks)}`],
      ["Attendance", `${attendance === null ? student.attendance : attendance}%`],
      ["Fees Balance", money(Math.max(0, fees.total - fees.paid))], ["Status", student.status]
    ];
    const resultRows = Examinations.all().filter((exam) => exam.marks && exam.marks[id] !== undefined);
    const results = resultRows.map((exam) => `<div class="detail-row"><span class="detail-row__label">${escapeHtml(exam.name)}</span><strong>${exam.marks[id]} / ${exam.maxMarks} · ${StudentModel.calculateGrade(exam.marks[id] / exam.maxMarks * 100)}</strong></div>`).join("");
    const payments = fees.payments.map((payment) => `<div class="detail-row"><span class="detail-row__label">${escapeHtml(payment.date)} · ${escapeHtml(payment.method)}</span><strong>${money(payment.amount)}</strong></div>`).join("");
    const activity = Notifications.all().filter((item) => item.message.toLowerCase().includes(student.name.toLowerCase())).slice(0, 5)
      .map((item) => `<div class="detail-row"><span class="detail-row__label">${escapeHtml(new Date(item.date).toLocaleDateString())}</span><strong class="detail-row__value">${escapeHtml(item.title)}</strong></div>`).join("");
    const personal = rows.map(([label, value]) => `<div class="detail-row"><span class="detail-row__label">${escapeHtml(label)}</span><strong class="detail-row__value">${escapeHtml(value)}</strong></div>`).join("");
    showModal("Student Profile", `${student.photo ? `<img src="${escapeHtml(student.photo)}" alt="${escapeHtml(student.name)}" style="width:76px;height:76px;object-fit:cover;border-radius:20px;margin-bottom:12px">` : ""}${personal}<h3 class="form-section-title">Examination Results</h3>${results || '<p class="muted">No examination results recorded.</p>'}<h3 class="form-section-title">Fee Payment History</h3>${payments || '<p class="muted">No payments recorded.</p>'}<h3 class="form-section-title">Activity History</h3>${activity || '<p class="muted">No activity recorded for this student.</p>'}`,
      `<button class="btn btn--outline" data-action="back-students">Back to Students</button><button class="btn btn--outline" data-action="print-profile" data-id="${escapeHtml(id)}">Print Profile</button><button class="btn btn--primary" data-action="edit-student" data-id="${escapeHtml(id)}">Edit Student</button>`);
  }

  function studentPayload() {
    return {
      studentCode: $("#f-student-code").value, roll: $("#f-roll").value, name: $("#f-name").value, email: $("#f-email").value, phone: $("#f-phone").value,
      gender: $("#f-gender").value, dob: $("#f-dob").value, address: $("#f-address").value, city: $("#f-city").value, state: $("#f-state").value, photo: $("#f-photo").value,
      guardian: $("#f-guardian").value, guardianPhone: $("#f-guardian-phone").value, relationship: $("#f-relationship").value,
      course: $("#f-course").value, department: $("#f-department").value, semester: $("#f-semester").value,
      admissionDate: $("#f-admission").value, marks: $("#f-marks").value, attendance: $("#f-attendance").value, status: $("#f-status").value
    };
  }

  function updateGradePreview() {
    const input = $("#f-marks").value;
    if (input === "" || !Number.isFinite(Number(input))) $("#grade-preview").textContent = "—";
    else $("#grade-preview").textContent = `${StudentModel.calculateGrade(Number(input))} (${StudentModel.calculatePassFail(Number(input))})`;
  }

  function exportCSV(rows, filename, headers) {
    const csvValue = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const content = [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))]
      .map((row) => row.map(csvValue).join(",")).join("\r\n");
    Settings.download(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }), filename);
  }

  function parseCSV(text) {
    const rows = [];
    let row = [], cell = "", quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      if (character === '"' && quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (character === '"') quoted = !quoted;
      else if (character === "," && !quoted) { row.push(cell); cell = ""; }
      else if ((character === "\n" || character === "\r") && !quoted) {
        if (character === "\r" && text[index + 1] === "\n") index += 1;
        row.push(cell); if (row.some((value) => value.trim())) rows.push(row);
        row = []; cell = "";
      } else cell += character;
    }
    if (cell || row.length) { row.push(cell); if (row.some((value) => value.trim())) rows.push(row); }
    return rows;
  }

  function renderAttendance() {
    populateStudentOptions();
    const dateInput = $("#attendance-date");
    if (!dateInput.value) dateInput.value = localDate();
    const list = students().filter((student) =>
      ($("#attendance-course").value === "All" || student.course === $("#attendance-course").value) &&
      ($("#attendance-semester").value === "All" || student.semester === $("#attendance-semester").value));
    const dated = Attendance.getForDate(dateInput.value);
    const recorded = new Map(dated.map((record) => [record.studentId, record.status]));
    $("#attendance-body").innerHTML = list.map((student) => {
      const value = recorded.get(student.id) || "Present";
      return `<tr><td>${studentCell(student)}</td><td>${escapeHtml(student.roll)}</td><td>${escapeHtml(student.course)}</td><td>${Attendance.getPercentage(student.id) ?? student.attendance}%</td><td><div class="attendance-choice">${["Present", "Absent", "Late"].map((status) => `<label><input type="radio" name="att-${escapeHtml(student.id)}" value="${status}" ${status === value ? "checked" : ""}>${status}</label>`).join("")}</div></td></tr>`;
    }).join("") || '<tr><td colspan="5" class="empty-state">No students in this course.</td></tr>';
    const present = dated.filter((record) => record.status === "Present").length;
    const absent = dated.filter((record) => record.status === "Absent").length;
    const late = dated.filter((record) => record.status === "Late").length;
    $("#attendance-summary").innerHTML = `<span class="summary-chip">Present · ${present}</span><span class="summary-chip summary-chip--red">Absent · ${absent}</span><span class="summary-chip summary-chip--amber">Late · ${late}</span>`;
    const filterDate = $("#attendance-filter-date").value;
    const filterMonth = $("#attendance-filter-month").value;
    const studentQuery = $("#attendance-filter-student").value.trim().toLowerCase();
    const history = Attendance.getHistory({ date: filterDate }).filter((record) => !filterMonth || record.date.startsWith(filterMonth));
    const monthlyPresent = history.filter((record) => record.status === "Present").length;
    const monthlyAbsent = history.filter((record) => record.status === "Absent").length;
    const monthlyLate = history.filter((record) => record.status === "Late").length;
    const monthlyRate = history.length ? Math.round((monthlyPresent + monthlyLate) / history.length * 100) : 0;
    $("#attendance-monthly-summary").innerHTML = `<span class="summary-chip">Records · ${history.length}</span><span class="summary-chip">Attendance · ${monthlyRate}%</span><span class="summary-chip">Present · ${monthlyPresent}</span><span class="summary-chip summary-chip--red">Absent · ${monthlyAbsent}</span><span class="summary-chip summary-chip--amber">Late · ${monthlyLate}</span>`;
    $("#attendance-history").innerHTML = history.filter((record) => {
      const student = StudentModel.getById(record.studentId);
      return !studentQuery || (student && `${student.name} ${student.roll}`.toLowerCase().includes(studentQuery));
    }).map((record) => {
      const student = StudentModel.getById(record.studentId);
      return `<tr><td>${escapeHtml(record.date)}</td><td>${student ? escapeHtml(student.name) : "Removed student"}</td><td>${student ? escapeHtml(student.course) : "—"}</td><td><span class="badge ${record.status === "Absent" ? "badge--inactive" : record.status === "Late" ? "badge--late" : "badge--present"}">${escapeHtml(record.status)}</span></td></tr>`;
    }).join("") || '<tr><td colspan="4" class="empty-state">No attendance history for this filter.</td></tr>';
  }

  function renderCourses() {
    const courseList = Courses.all();
    $("#course-grid").innerHTML = courseList.map((course, index) => {
      const count = students().filter((student) => student.course === course.name).length;
      const icons = ["⌘", "▦", "⚙", "ϟ"];
      return `<article class="course-card"><div class="course-card__actions"><button class="action-button" data-action="view-course" data-id="${escapeHtml(course.id)}" aria-label="View course">◉</button><button class="action-button" data-action="edit-course" data-id="${escapeHtml(course.id)}" aria-label="Edit course">✎</button><button class="action-button action-button--delete" data-action="delete-course" data-id="${escapeHtml(course.id)}" aria-label="Delete course">×</button></div><div class="course-card__icon">${icons[index % icons.length]}</div><h3>${escapeHtml(course.name)}</h3><p>${escapeHtml(course.description || "No course description added.")}</p><div class="course-card__meta"><span>${escapeHtml(course.id)} · ${escapeHtml(course.department || "Unassigned")}</span><span>${escapeHtml(course.duration || "Duration not set")}</span></div><div class="course-card__meta"><span>Sem ${escapeHtml(course.semester || "—")} · Enrolled</span><strong>${count}</strong></div></article>`;
    }).join("") || '<article class="panel panel--form"><p class="muted">No courses yet. Add a course to get started.</p></article>';
  }

  function courseForm(course = {}) {
    showModal(course.id ? "Edit Course" : "Add Course", `<form id="course-form" class="modal-form">
      <input type="hidden" name="id" value="${escapeHtml(course.id || "")}">
      <div class="field"><label>Course Name *</label><input class="input" name="name" required value="${escapeHtml(course.name || "")}" placeholder="Course title"></div>
      <div class="field"><label>Department</label><input class="input" name="department" value="${escapeHtml(course.department || "")}"></div>
      <div class="field"><label>Duration</label><input class="input" name="duration" value="${escapeHtml(course.duration || "")}" placeholder="e.g. 4 years"></div>
      <div class="field"><label>Semester / Term</label><input class="input" name="semester" value="${escapeHtml(course.semester || "")}" placeholder="e.g. 1–8"></div>
      <div class="field"><label>Description</label><input class="input" name="description" value="${escapeHtml(course.description || "")}"></div>
      <div class="form-actions"><button class="btn btn--primary">Save Course</button></div></form>`);
  }

  function renderExaminations() {
    const exams = Examinations.all().sort((a, b) => a.date.localeCompare(b.date));
    $("#exam-list").innerHTML = exams.map((exam) => `<div class="exam-card"><div class="exam-date">${new Date(`${exam.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div><div class="exam-card__info"><strong>${escapeHtml(exam.name)}</strong><small>${escapeHtml(exam.subject)} · ${escapeHtml(exam.course)} · Max ${exam.maxMarks}</small></div><div class="exam-card__actions"><button class="action-button" data-action="view-exam" data-id="${escapeHtml(exam.id)}" aria-label="View examination">◉</button><button class="action-button" data-action="edit-exam" data-id="${escapeHtml(exam.id)}" aria-label="Edit examination">✎</button><button class="btn btn--outline btn--sm" data-action="enter-exam-marks" data-id="${escapeHtml(exam.id)}">Enter marks</button><button class="action-button action-button--delete" data-action="delete-exam" data-id="${escapeHtml(exam.id)}" aria-label="Delete examination">×</button></div></div>`).join("") || '<p class="muted">No examinations scheduled.</p>';
  }

  function renderResults() {
    const query = $("#result-search").value.trim().toLowerCase();
    const exams = Examinations.all();
    setSelectOptions($("#result-course-filter"), Courses.all().map((course) => course.name));
    const previousExam = $("#result-exam-filter").value || "All";
    $("#result-exam-filter").innerHTML = '<option value="All">All Examinations</option>' +
      exams.map((exam) => `<option value="${escapeHtml(exam.id)}">${escapeHtml(exam.name)}</option>`).join("");
    if (exams.some((exam) => exam.id === previousExam)) $("#result-exam-filter").value = previousExam;
    const selectedCourse = $("#result-course-filter").value;
    const selectedExam = $("#result-exam-filter").value;
    const rows = Results.getRows(students(), exams).filter((row) =>
      (!query || `${row.student.name} ${row.student.roll}`.toLowerCase().includes(query)) &&
      (selectedCourse === "All" || row.student.course === selectedCourse) &&
      (selectedExam === "All" || row.examId === selectedExam));
    $("#results-body").innerHTML = rows.map((row) => `<tr><td>${studentCell(row.student)}</td><td>${escapeHtml(row.student.roll)}</td><td>${escapeHtml(row.student.course)}</td><td>${escapeHtml(row.examination)}<small class="muted">${escapeHtml(row.subject)}</small></td><td>${row.marks} / ${row.maximum}</td><td>${row.percentage}%</td><td>${gradeBadge(row.grade)}</td><td><span class="badge ${row.result === "Fail" ? "badge--fail" : "badge--present"}">${row.result === "Pass" ? "Passed" : "Failed"}</span></td><td><button class="action-button" data-action="view-result" data-id="${escapeHtml(row.student.id)}" data-exam-id="${escapeHtml(row.examId)}" aria-label="View result">◉</button><button class="action-button" data-action="print-result" data-id="${escapeHtml(row.student.id)}" title="Print result">⎙</button></td></tr>`).join("")
      || '<tr><td colspan="9" class="empty-state">No results match your search or filters.</td></tr>';
  }

  function examForm(exam = {}) {
    showModal(exam.id ? "Edit Examination" : "Add Examination", `<form id="exam-form" class="modal-form">
      <input type="hidden" name="id" value="${escapeHtml(exam.id || "")}">
      <div class="field"><label>Examination Name *</label><input class="input" name="name" required value="${escapeHtml(exam.name || "")}" placeholder="e.g. End of Term Assessment"></div>
      <div class="field"><label>Subject *</label><input class="input" name="subject" required value="${escapeHtml(exam.subject || "")}" placeholder="Subject or subject group"></div>
      <div class="field"><label>Course</label><select class="input" name="course"><option>All Courses</option>${Courses.all().map((course) => `<option ${course.name === exam.course ? "selected" : ""}>${escapeHtml(course.name)}</option>`).join("")}</select></div>
      <div class="field"><label>Examination Date *</label><input class="input" name="date" type="date" value="${escapeHtml(exam.date || "")}" required></div>
      <div class="field"><label>Maximum Marks *</label><input class="input" name="maxMarks" type="number" min="1" value="${escapeHtml(exam.maxMarks || 100)}" required></div>
      <div class="form-actions"><button class="btn btn--primary">Create Examination</button></div></form>`);
  }

  function enterExamMarks(examId) {
    const exam = Examinations.all().find((item) => item.id === examId);
    if (!exam) return;
    const eligible = students().filter((student) => exam.course === "All Courses" || student.course === exam.course);
    showModal(`Enter Marks · ${exam.name}`, `<form id="exam-marks-form" class="modal-form"><input type="hidden" name="examId" value="${escapeHtml(examId)}">
      <div class="field"><label>Student *</label><select class="input" name="studentId" required>${eligible.map((student) => `<option value="${escapeHtml(student.id)}">${escapeHtml(student.name)} · ${escapeHtml(student.roll)}</option>`).join("")}</select></div>
      <div class="field"><label>Marks (0–${exam.maxMarks}) *</label><input class="input" name="marks" type="number" min="0" max="${exam.maxMarks}" required></div>
      <p class="muted">Result grade and pass/fail status are calculated from the percentage.</p><div class="form-actions"><button class="btn btn--primary">Save Result</button></div></form>`);
  }

  function renderFees() {
    const list = students().map((student) => ({ student, fee: Fees.forStudent(student.id) }));
    const summary = Fees.getSummary();
    $("#fees-total").textContent = money(summary.total);
    $("#fees-paid").textContent = money(summary.paid);
    $("#fees-pending").textContent = money(summary.pending);
    $("#fees-overdue").textContent = money(summary.overdue);
    $("#fees-transactions").textContent = summary.transactions.toLocaleString("en-IN");
    const filter = $("#fees-filter").value;
    const query = $("#fees-search").value.trim().toLowerCase();
    $("#fees-body").innerHTML = list.filter(({ student, fee }) => {
      const balance = Math.max(0, fee.total - fee.paid);
      const overdue = balance > 0 && fee.dueDate < localDate();
      const statusMatches = filter === "All" || (filter === "Paid" ? balance === 0 : filter === "Overdue" ? overdue : balance > 0);
      return statusMatches && (!query || `${student.name} ${student.roll} ${student.id}`.toLowerCase().includes(query));
    }).map(({ student, fee }) => {
      const balance = Math.max(0, fee.total - fee.paid);
      const overdue = balance > 0 && fee.dueDate < localDate();
      const status = balance === 0 ? "Paid" : overdue ? "Overdue" : "Pending";
      return `<tr><td>${studentCell(student)}</td><td>${escapeHtml(student.roll)}</td><td>${money(fee.total)}</td><td>${money(fee.paid)}</td><td>${money(balance)}</td><td>${escapeHtml(fee.dueDate)}</td><td><span class="badge ${balance === 0 ? "badge--paid" : overdue ? "badge--fail" : "badge--pending"}">${status}</span></td><td><div class="table-actions">${balance ? `<button class="btn btn--primary btn--sm" data-action="add-payment" data-id="${escapeHtml(student.id)}">Add payment</button>` : ""}<button class="action-button" data-action="fee-history" data-id="${escapeHtml(student.id)}" aria-label="View payment history">◷</button><button class="action-button" data-action="due-date" data-id="${escapeHtml(student.id)}" aria-label="Change due date">▦</button><button class="action-button" data-action="receipt" data-id="${escapeHtml(student.id)}" aria-label="Print fee receipt">⎙</button></div></td></tr>`;
    }).join("") || '<tr><td colspan="8" class="empty-state">No fee records match this filter.</td></tr>';
  }

  function feeRecordForm() {
    showModal("Add / Update Fee Record", `<form id="fee-record-form" class="modal-form">
      <div class="field"><label>Student *</label><select class="input" name="studentId" required>${students().map((student) => `<option value="${escapeHtml(student.id)}">${escapeHtml(student.name)} · ${escapeHtml(student.roll)}</option>`).join("")}</select></div>
      <div class="field"><label>Total Fees (INR) *</label><input class="input" name="total" type="number" min="1" step="1" required></div>
      <div class="field"><label>Due Date *</label><input class="input" name="dueDate" type="date" min="${localDate()}" required></div>
      <div class="form-actions"><button class="btn btn--primary">Save Fee Record</button></div></form>`);
  }

  function feeHistory(studentId) {
    const student = StudentModel.getById(studentId);
    if (!student) return;
    const fee = Fees.forStudent(studentId);
    const payments = fee.payments.map((payment) => `<div class="detail-row"><span class="detail-row__label">${escapeHtml(payment.date)} · ${escapeHtml(payment.method)}</span><strong>${money(payment.amount)}</strong></div>`).join("");
    showModal(`Payment History · ${student.name}`, `<div class="detail-row"><span class="detail-row__label">Total fees</span><strong>${money(fee.total)}</strong></div><div class="detail-row"><span class="detail-row__label">Paid to date</span><strong>${money(fee.paid)}</strong></div><div class="detail-row"><span class="detail-row__label">Balance</span><strong>${money(Math.max(0, fee.total - fee.paid))}</strong></div><h3 class="form-section-title">Transactions</h3>${payments || '<p class="muted">No payments recorded.</p>'}`);
  }

  function paymentForm(studentId) {
    const student = StudentModel.getById(studentId);
    const fee = Fees.forStudent(studentId);
    if (!student) return;
    showModal(`Add Payment · ${student.name}`, `<form id="payment-form" class="modal-form"><input type="hidden" name="studentId" value="${escapeHtml(studentId)}">
      <p class="muted">Outstanding balance: <strong>${money(Math.max(0, fee.total - fee.paid))}</strong></p>
      <div class="field"><label>Amount *</label><input class="input" name="amount" type="number" min="1" max="${Math.max(0, fee.total - fee.paid)}" required></div>
      <div class="field"><label>Payment Method</label><select class="input" name="method"><option>Cash</option><option>UPI</option><option>Bank transfer</option><option>Card</option><option>Online</option></select></div>
      <div class="form-actions"><button class="btn btn--primary">Record Payment</button></div></form>`);
  }

  function printReceipt(studentId) {
    const student = StudentModel.getById(studentId);
    if (!student) return;
    const fee = Fees.forStudent(studentId);
    const receipt = fee.payments[fee.payments.length - 1];
    const page = window.open("", "_blank", "width=680,height=760");
    if (!page) return toast("Allow pop-ups to print the fee receipt.", "error");
    page.document.write(`<!doctype html><title>Fee Receipt</title><style>body{font:16px Arial;max-width:620px;margin:50px auto;color:#222}header{border-bottom:2px solid #6745e9;padding-bottom:15px}h1{color:#4d35c5}p{padding:9px 0;border-bottom:1px solid #ddd}.total{font-size:20px;font-weight:bold}</style><header><h1>${escapeHtml(Settings.get().schoolName || "Scholar Academy")}</h1><p>Official Fee Payment Receipt</p></header><p>Student: <strong>${escapeHtml(student.name)}</strong></p><p>Roll Number: ${escapeHtml(student.roll)}</p><p>Student ID: ${escapeHtml(student.id)}</p><p>Receipt date: ${escapeHtml(receipt?.date || localDate())}</p><p>Payment method: ${escapeHtml(receipt?.method || "—")}</p><p class="total">Amount received: ${money(receipt?.amount || 0)}</p><p>Paid to date: ${money(fee.paid)} · Balance: ${money(Math.max(0, fee.total - fee.paid))}</p><script>window.onload=()=>window.print();<\/script>`);
    page.document.close();
  }

  function renderReports() {
    setSelectOptions($("#report-course-filter"), Courses.all().map((course) => course.name));
    let list = students();
    const from = $("#report-from").value;
    const to = $("#report-to").value;
    const course = $("#report-course-filter").value;
    if (from) list = list.filter((student) => student.admissionDate && student.admissionDate >= from);
    if (to) list = list.filter((student) => student.admissionDate && student.admissionDate <= to);
    if (course !== "All") list = list.filter((student) => student.course === course);
    const examinations = Examinations.all().filter((exam) => (!from || exam.date >= from) && (!to || exam.date <= to) && (course === "All" || exam.course === course || exam.course === "All Courses"));
    const data = Reports.summarize(list, examinations);
    const total = Math.max(1, list.length);
    renderBars($("#report-course"), data.courses.map((item) => ({ label: item.label, value: `${item.value} student(s)`, percent: item.value / total * 100 })));
    const admissions = getMonthlyAdmissions(list);
    const maxMonthlyAdmissions = Math.max(1, ...admissions.map((item) => item.count));
    renderBars($("#report-admissions"), admissions.map((item) => ({
      label: item.label, value: `${item.count} student(s)`,
      percent: item.count / maxMonthlyAdmissions * 100, color: "bar-fill--teal"
    })));
    renderBars($("#report-grade"), data.grades.map((item) => ({ label: `Grade ${item.label}`, value: `${item.value} student(s)`, percent: item.value / total * 100, color: item.label === "F" ? "bar-fill--red" : ["A+", "A"].includes(item.label) ? "bar-fill--green" : "" })));
    renderBars($("#report-passfail"), [{ label: "Passed", value: `${data.passed} (${Math.round(data.passed / total * 100)}%)`, percent: data.passed / total * 100, color: "bar-fill--green" }, { label: "Failed", value: `${data.failed} (${Math.round(data.failed / total * 100)}%)`, percent: data.failed / total * 100, color: "bar-fill--red" }]);
    $("#report-avg").textContent = data.average;
    const feeSummary = getFeeReportSummary(course, from, to);
    const feeTotal = feeSummary.collected + feeSummary.pending;
    renderBars($("#report-fees"), [{ label: "Collected", value: money(feeSummary.collected), percent: feeTotal ? feeSummary.collected / feeTotal * 100 : 0, color: "bar-fill--green" }, { label: "Outstanding", value: money(feeSummary.pending), percent: feeTotal ? feeSummary.pending / feeTotal * 100 : 0, color: "bar-fill--amber" }]);
    const attendanceRecords = Attendance.all().filter((record) => {
      const student = StudentModel.getById(record.studentId);
      return (!from || record.date >= from) && (!to || record.date <= to) && (course === "All" || student?.course === course);
    });
    const present = attendanceRecords.filter((record) => record.status !== "Absent").length;
    const hasAttendanceRecords = Attendance.all().length > 0;
    const attendancePercent = attendanceRecords.length
      ? Math.round(present / attendanceRecords.length * 100)
      : (!hasAttendanceRecords && !from && !to && list.length
        ? Math.round(list.reduce((sum, student) => sum + student.attendance, 0) / list.length)
        : 0);
    renderBars($("#report-attendance"), [{ label: "Present / late", value: `${attendancePercent}%`, percent: attendancePercent, color: "bar-fill--teal" }, { label: "Absent", value: `${100 - attendancePercent}%`, percent: 100 - attendancePercent, color: "bar-fill--red" }]);
    renderBars($("#report-subject"), data.subjects.map((subject) => ({
      label: subject.label,
      value: `${subject.average}% average`,
      percent: subject.average,
      color: subject.average >= 70 ? "bar-fill--green" : subject.average < 50 ? "bar-fill--red" : "bar-fill--amber"
    })));
  }

  function getMonthlyAdmissions(list) {
    const counts = new Map();
    list.forEach((student) => {
      if (!/^\d{4}-\d{2}/.test(student.admissionDate || "")) return;
      const month = student.admissionDate.slice(0, 7);
      counts.set(month, (counts.get(month) || 0) + 1);
    });
    return [...counts.entries()].sort(([first], [second]) => first.localeCompare(second)).slice(-12)
      .map(([month, count]) => ({
        label: new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
        count
      }));
  }

  function getFeeReportSummary(course, from, to) {
    const feeStudents = students().filter((student) => course === "All" || student.course === course);
    const records = feeStudents.map((student) => Fees.forStudent(student.id));
    const collected = records.reduce((sum, fee) => sum + fee.payments
      .filter((payment) => (!from || payment.date >= from) && (!to || payment.date <= to))
      .reduce((paymentSum, payment) => paymentSum + payment.amount, 0), 0);
    const pending = records.filter((fee) => (!from || fee.dueDate >= from) && (!to || fee.dueDate <= to))
      .reduce((sum, fee) => sum + Math.max(0, fee.total - fee.paid), 0);
    return { collected, pending };
  }

  function renderBars(container, rows) {
    container.innerHTML = rows.length ? rows.map((row) => `<div class="bar-row"><div class="bar-row__label"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div><div class="bar-track"><div class="bar-fill ${row.color || ""}" style="width:${Math.max(0, Math.min(100, row.percent))}%"></div></div></div>`).join("") : '<p class="muted">No data available.</p>';
  }

  function renderNotifications() {
    const icons = { exam: "✎", fees: "₹", attendance: "◷", student: "♧", info: "✦" };
    $("#notification-list").innerHTML = Notifications.all().map((item) => `<article class="notification-item ${item.read ? "" : "unread"}"><span class="notification-icon">${icons[item.type] || icons.info}</span><div class="notification-copy"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.message)}</p><small>${new Date(item.date).toLocaleString()}</small></div>${item.read ? '<span class="muted">Read</span>' : `<button data-action="read-notification" data-id="${escapeHtml(item.id)}">Mark read</button>`}<button class="action-button action-button--delete" data-action="delete-notification" data-id="${escapeHtml(item.id)}" aria-label="Delete notification">×</button></article>`).join("") || '<p class="empty-state">You are all caught up.</p>';
    $("#notification-count").textContent = Notifications.unreadCount();
    $(".notification-button i").style.display = Notifications.unreadCount() ? "block" : "none";
  }

  function renderSettings() {
    const config = Settings.get();
    $("#school-name").value = config.schoolName || "";
    $("#admin-name").value = config.adminName || "";
    $("#school-email").value = config.email || "";
    $("#school-phone").value = config.phone || "";
    $("#profile-admin-name").textContent = config.adminName || "Admin";
    $(".avatar").textContent = (config.adminName || "A").trim().charAt(0).toUpperCase();
    $("#theme-toggle").checked = config.theme === "dark";
  }

  function handleAction(action, id, examId = "") {
    if (action === "view-student") viewStudent(id);
    if (action === "edit-student") { closeModal(); editStudent(id); }
    if (action === "delete-student") {
      const student = StudentModel.getById(id);
      if (student && window.confirm(`Delete ${student.name} (${student.roll})? This cannot be undone.`)) {
        deleteStudentRecord(id);
        Notifications.add("student", "Student record deleted", `${student.name} · ${student.roll}`);
        toast("Student record and related attendance, fee and result data deleted."); renderStudents(); renderDashboard();
      }
    }
    if (action === "back-students") { closeModal(); navigate("students"); }
    if (action === "print-profile") printStudentProfile(id);
    if (action === "view-course") {
      const course = Courses.all().find((item) => item.id === id);
      if (course) {
        const enrolled = students().filter((student) => student.course === course.name);
        showModal(course.name, `<div class="detail-row"><span class="detail-row__label">Course ID</span><strong>${escapeHtml(course.id)}</strong></div><div class="detail-row"><span class="detail-row__label">Department</span><strong>${escapeHtml(course.department || "—")}</strong></div><div class="detail-row"><span class="detail-row__label">Duration / Semester</span><strong>${escapeHtml(course.duration || "—")} · ${escapeHtml(course.semester || "—")}</strong></div><div class="detail-row"><span class="detail-row__label">Enrolled students</span><strong>${enrolled.length}</strong></div><p>${escapeHtml(course.description || "No course description added.")}</p>${enrolled.map((student) => `<div class="detail-row"><span class="detail-row__label">${escapeHtml(student.roll)}</span><strong>${escapeHtml(student.name)}</strong></div>`).join("")}`);
      }
    }
    if (action === "edit-course") courseForm(Courses.all().find((course) => course.id === id));
    if (action === "delete-course") {
      const course = Courses.all().find((item) => item.id === id);
      if (!course) return;
      const used = students().some((student) => student.course === course.name);
      if (window.confirm(`${used ? "Students are enrolled in this course. " : ""}Delete ${course.name}?`)) {
        Courses.remove(id); Notifications.add("info", "Course deleted", course.name); renderCourses(); renderDashboard(); toast("Course deleted.");
      }
    }
    if (action === "view-exam") viewExam(id);
    if (action === "edit-exam") examForm(Examinations.all().find((exam) => exam.id === id));
    if (action === "delete-exam") {
      if (window.confirm("Delete this examination and its recorded results?")) { Examinations.remove(id); Notifications.add("exam", "Examination deleted", id); renderExaminations(); renderResults(); renderDashboard(); toast("Examination deleted."); }
    }
    if (action === "enter-exam-marks") enterExamMarks(id);
    if (action === "view-result") viewResult(id, examId);
    if (action === "add-payment") paymentForm(id);
    if (action === "due-date") dueDateForm(id);
    if (action === "receipt") printReceipt(id);
    if (action === "print-result") printResult(id);
    if (action === "read-notification") { Notifications.markRead(id); renderNotifications(); }
    if (action === "delete-notification" && window.confirm("Delete this notification?")) { Notifications.remove(id); renderNotifications(); toast("Notification deleted."); }
    if (action === "fee-history") feeHistory(id);
  }

  function viewExam(id) {
    const exam = Examinations.all().find((item) => item.id === id);
    if (!exam) return;
    const recorded = Object.entries(exam.marks || {}).filter(([studentId]) => StudentModel.getById(studentId));
    const passed = recorded.filter(([, marks]) => StudentModel.calculatePassFail(marks / exam.maxMarks * 100) === "Pass").length;
    const rows = recorded.map(([studentId, marks]) => {
      const student = StudentModel.getById(studentId);
      return `<div class="detail-row"><span class="detail-row__label">${escapeHtml(student.roll)} · ${escapeHtml(student.name)}</span><strong>${marks} / ${exam.maxMarks} · ${StudentModel.calculateGrade(marks / exam.maxMarks * 100)}</strong></div>`;
    }).join("");
    showModal(exam.name, `<div class="detail-row"><span class="detail-row__label">Subject / Course</span><strong>${escapeHtml(exam.subject)} · ${escapeHtml(exam.course)}</strong></div><div class="detail-row"><span class="detail-row__label">Date / Maximum</span><strong>${escapeHtml(exam.date)} · ${exam.maxMarks} marks</strong></div><div class="detail-row"><span class="detail-row__label">Recorded results</span><strong>${recorded.length} · ${passed} passed · ${recorded.length - passed} failed</strong></div><h3 class="form-section-title">Results</h3>${rows || '<p class="muted">No marks entered yet.</p>'}`, `<button class="btn btn--primary" data-action="enter-exam-marks" data-id="${escapeHtml(id)}">Enter marks</button>`);
  }

  function viewResult(studentId, examId) {
    const student = StudentModel.getById(studentId);
    if (!student) return;
    const row = Results.getRows([student], Examinations.all()).find((item) => item.examId === examId) ||
      Results.getRows([student], Examinations.all()).find((item) => !item.examId);
    if (!row) return toast("Result record was not found.", "error");
    showModal("Student Result", `<div class="detail-row"><span class="detail-row__label">Student</span><strong>${escapeHtml(student.name)} · ${escapeHtml(student.roll)}</strong></div><div class="detail-row"><span class="detail-row__label">Course</span><strong>${escapeHtml(student.course)}</strong></div><div class="detail-row"><span class="detail-row__label">Examination / Subject</span><strong>${escapeHtml(row.examination)} · ${escapeHtml(row.subject)}</strong></div><div class="detail-row"><span class="detail-row__label">Marks</span><strong>${row.marks} / ${row.maximum} (${row.percentage}%)</strong></div><div class="detail-row"><span class="detail-row__label">Grade / Result</span><strong>${row.grade} · ${row.result === "Pass" ? "Passed" : "Failed"}</strong></div>`, `<button class="btn btn--outline" data-action="print-result" data-id="${escapeHtml(studentId)}">Print result card</button>`);
  }

  function printResult(id) {
    const student = StudentModel.getById(id);
    if (!student) return;
    const page = window.open("", "_blank", "width=680,height=760");
    if (!page) return toast("Allow pop-ups to print the result card.", "error");
    const exams = Examinations.all().filter((exam) => exam.marks && exam.marks[id] !== undefined);
    const results = exams.map((exam) => {
      const percent = exam.marks[id] / exam.maxMarks * 100;
      return `<tr><td>${escapeHtml(exam.name)}</td><td>${escapeHtml(exam.subject)}</td><td>${exam.marks[id]} / ${exam.maxMarks}</td><td>${percent.toFixed(1)}%</td><td>${StudentModel.calculateGrade(percent)}</td><td>${StudentModel.calculatePassFail(percent) === "Pass" ? "Passed" : "Failed"}</td></tr>`;
    }).join("");
    page.document.write(`<!doctype html><title>Student Result</title><style>body{font:15px Arial;max-width:720px;margin:40px auto;color:#222}h1{color:#4d35c5}table{width:100%;border-collapse:collapse}td,th{padding:12px;border:1px solid #ddd;text-align:left}header{padding-bottom:15px;border-bottom:2px solid #6745e9}</style><header><h1>Scholar Academy</h1><h2>Student Result Card</h2></header><p><strong>${escapeHtml(student.name)}</strong> · Roll ${escapeHtml(student.roll)} · ${escapeHtml(student.course)}</p><table><thead><tr><th>Examination</th><th>Subject</th><th>Marks</th><th>Percent</th><th>Grade</th><th>Result</th></tr></thead><tbody>${results || `<tr><td>Current result</td><td>Overall</td><td>${student.marks} / 100</td><td>${student.marks}%</td><td>${StudentModel.calculateGrade(student.marks)}</td><td>${StudentModel.calculatePassFail(student.marks) === "Pass" ? "Passed" : "Failed"}</td></tr>`}</tbody></table><script>window.onload=()=>window.print()<\/script>`);
    page.document.close();
  }

  function printStudentProfile(id) {
    const student = StudentModel.getById(id);
    if (!student) return;
    const page = window.open("", "_blank", "width=720,height=850");
    if (!page) return toast("Allow pop-ups to print the student profile.", "error");
    const fee = Fees.forStudent(id);
    const values = [
      ["Student ID", student.id], ["Roll Number", student.roll], ["Email", student.email], ["Phone", student.phone],
      ["Course", student.course], ["Department", student.department || "—"], ["Semester / Class", student.semester],
      ["Date of Birth", student.dob || "—"], ["Address", [student.address, student.city, student.state].filter(Boolean).join(", ") || "—"], ["Admission Date", student.admissionDate || "—"], ["Marks", `${student.marks} / 100`],
      ["Grade", StudentModel.calculateGrade(student.marks)], ["Attendance", `${Attendance.getPercentage(id) ?? student.attendance}%`],
      ["Guardian", student.guardian || "—"], ["Guardian Phone", student.guardianPhone || "—"], ["Relationship", student.relationship || "—"], ["Fee Balance", money(Math.max(0, fee.total - fee.paid))], ["Status", student.status]
    ];
    const details = values.map(([label, value]) => `<p><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></p>`).join("");
    page.document.write(`<!doctype html><title>Student Profile</title><style>body{font:14px Arial;max-width:720px;margin:40px auto;color:#222}header{padding-bottom:18px;border-bottom:2px solid #6745e9}h1{color:#4d35c5}p{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #ddd}header p{display:block;border:0}</style><header><h1>Scholar Academy</h1><h2>Student Profile</h2><p>${escapeHtml(student.name)} · ${escapeHtml(student.roll)}</p></header>${details}<script>window.onload=()=>window.print()<\/script>`);
    page.document.close();
  }

  function dueDateForm(studentId) {
    const student = StudentModel.getById(studentId);
    if (!student) return;
    const fee = Fees.forStudent(studentId);
    showModal(`Update Due Date · ${student.name}`, `<form id="due-date-form" class="modal-form"><input type="hidden" name="studentId" value="${escapeHtml(studentId)}"><div class="field"><label>Fee Due Date *</label><input class="input" type="date" name="dueDate" value="${escapeHtml(fee.dueDate)}" required></div><div class="form-actions"><button class="btn btn--primary">Save Due Date</button></div></form>`);
  }

  $("#menu-toggle").addEventListener("click", () => {
    if (window.matchMedia("(max-width: 850px)").matches) {
      $("#sidebar").classList.toggle("open");
      $("#sidebar-scrim").classList.toggle("visible");
    } else {
      document.body.classList.toggle("sidebar-collapsed");
    }
  });
  $("#sidebar-scrim").addEventListener("click", () => { $("#sidebar").classList.remove("open"); $("#sidebar-scrim").classList.remove("visible"); });
  document.addEventListener("click", (event) => {
    const profileToggle = event.target.closest("#profile-menu-toggle");
    if (profileToggle) {
      const menu = $("#profile-menu");
      menu.hidden = !menu.hidden;
      profileToggle.setAttribute("aria-expanded", String(!menu.hidden));
      return;
    }
    if (!event.target.closest(".profile-area")) {
      $("#profile-menu").hidden = true;
      $("#profile-menu-toggle").setAttribute("aria-expanded", "false");
    }
    const profileReset = event.target.closest("[data-profile-reset]");
    if (profileReset) { $("#profile-menu").hidden = true; resetAll(); return; }
    const navigation = event.target.closest("[data-page]");
    if (navigation) { event.preventDefault(); navigate(navigation.dataset.page); return; }
    const action = event.target.closest("[data-action]");
    if (action) handleAction(action.dataset.action, action.dataset.id, action.dataset.examId);
  });
  $$("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModal));
  $("#view-modal-overlay").addEventListener("click", (event) => { if (event.target === $("#view-modal-overlay")) closeModal(); });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
      $("#profile-menu").hidden = true;
      $("#profile-menu-toggle").setAttribute("aria-expanded", "false");
    }
  });
  $("#topbar-add-btn").addEventListener("click", () => { state.editingId = null; navigate("add"); });
  $("#global-search").addEventListener("input", (event) => {
    $("#search-input").value = event.target.value;
    state.studentPage = 1;
    if (event.target.value) navigate("students");
    else if (state.page === "students") renderStudents();
  });

  $("#student-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = studentPayload();
    const result = StudentModel.validateStudent(data, state.editingId);
    $$(".field__error").forEach((item) => item.textContent = "");
    $$(".input").forEach((item) => item.classList.remove("input--invalid"));
    if (!result.valid) {
      Object.entries(result.errors).forEach(([field, message]) => {
        const error = $(`#err-${field}`);
        const inputId = { studentCode: "f-student-code", guardianPhone: "f-guardian-phone" }[field] || `f-${field}`;
        const input = $(`#${inputId}`);
        if (error) error.textContent = message;
        if (input) input.classList.add("input--invalid");
      });
      toast("Please correct the highlighted fields.", "error");
      return;
    }
    const editing = state.editingId;
    if (editing) StudentModel.updateStudent(editing, data);
    else StudentModel.addStudent(data);
    Notifications.add("student", editing ? "Student profile updated" : "New student registration", `${data.name} · ${data.course}`);
    toast(editing ? "Student profile updated." : "Student added successfully.");
    resetStudentForm();
    navigate("students");
    renderDashboard();
  });
  $("#f-marks").addEventListener("input", updateGradePreview);
  $("#form-cancel-btn").addEventListener("click", () => { resetStudentForm(); navigate("students"); });
  ["search-input", "filter-course", "filter-status"].forEach((id) => $(`#${id}`).addEventListener(id === "search-input" ? "input" : "change", () => { state.studentPage = 1; renderStudents(); }));
  $("#sort-field").addEventListener("change", (event) => { state.sort = event.target.value; renderStudents(); });
  $("#sort-direction-btn").addEventListener("click", () => { state.direction = state.direction === "asc" ? "desc" : "asc"; $("#sort-direction-btn").textContent = state.direction === "asc" ? "↑ Asc" : "↓ Desc"; renderStudents(); });
  $("#page-prev").addEventListener("click", () => { state.studentPage -= 1; renderStudents(); });
  $("#page-next").addEventListener("click", () => { state.studentPage += 1; renderStudents(); });
  $("#select-all-students").addEventListener("change", (event) => { $$(".student-select").forEach((input) => input.checked = event.target.checked); updateBulkButton(); });
  $("#students-body").addEventListener("change", (event) => { if (event.target.matches(".student-select")) updateBulkButton(); });
  $("#bulk-delete-btn").addEventListener("click", () => {
    const ids = $$(".student-select:checked").map((input) => input.value);
    if (!ids.length || !window.confirm(`Permanently delete ${ids.length} selected student record(s)?`)) return;
    ids.forEach((id) => deleteStudentRecord(id));
    Notifications.add("student", "Student records deleted", `${ids.length} student record(s) were deleted.`);
    toast(`${ids.length} student record(s) deleted.`);
    renderStudents(); renderDashboard();
  });

  $("#export-csv-btn").addEventListener("click", () => {
    const headers = ["id", "name", "roll", "email", "phone", "gender", "dob", "address", "city", "state", "course", "department", "semester", "admissionDate", "guardian", "guardianPhone", "relationship", "marks", "attendance", "status"];
    exportCSV(students(), "student-records.csv", headers);
    toast("Student CSV exported.");
  });
  $("#import-csv-btn").addEventListener("click", () => $("#csv-file").click());
  $("#csv-file").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const rows = parseCSV(await file.text());
      if (rows.length < 2) throw new Error("CSV must include a header and at least one student row.");
      const headers = rows[0].map((header) => header.replace(/^\uFEFF/, "").trim().toLowerCase());
      const required = ["name", "roll", "email", "phone", "course", "semester", "marks", "attendance", "status"];
      const missing = required.filter((header) => !headers.includes(header));
      if (missing.length) throw new Error(`CSV is missing required columns: ${missing.join(", ")}.`);
      let added = 0, rejected = 0;
      rows.slice(1).forEach((values) => {
        const item = Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
        const payload = {
          name: item.name, roll: item.roll, email: item.email, phone: item.phone, course: item.course,
          semester: item.semester, marks: item.marks, attendance: item.attendance, status: item.status,
          studentCode: item.id || StudentModel.getNextId(), gender: item.gender, dob: item.dob, address: item.address, city: item.city, state: item.state, photo: item.photo,
          department: item.department, admissionDate: item.admissiondate || item.admissionDate,
          guardian: item.guardian, guardianPhone: item.guardianphone || item.guardianPhone, relationship: item.relationship
        };
        const validation = StudentModel.validateStudent(payload);
        if (!validation.valid) { rejected += 1; return; }
        StudentModel.addStudent(payload); added += 1;
      });
      if (!added) throw new Error("No valid unique student records were found in the CSV.");
      toast(`${added} student(s) imported${rejected ? `; ${rejected} invalid or duplicate row(s) skipped` : ""}.`, rejected ? "error" : "success");
      renderStudents(); renderDashboard();
    } catch (error) { toast(error.message, "error"); }
    event.target.value = "";
  });

  $("#attendance-course").addEventListener("change", renderAttendance);
  $("#attendance-semester").addEventListener("change", renderAttendance);
  $("#attendance-date").addEventListener("change", renderAttendance);
  $("#attendance-filter-date").addEventListener("change", renderAttendance);
  $("#attendance-filter-month").addEventListener("change", renderAttendance);
  $("#attendance-filter-student").addEventListener("input", renderAttendance);
  $("#mark-all-present").addEventListener("click", () => {
    $$("#attendance-body input[type='radio'][value='Present']").forEach((input) => { input.checked = true; });
  });
  $("#save-attendance").addEventListener("click", () => {
    const date = $("#attendance-date").value;
    const list = students().filter((student) =>
      ($("#attendance-course").value === "All" || student.course === $("#attendance-course").value) &&
      ($("#attendance-semester").value === "All" || student.semester === $("#attendance-semester").value));
    try {
      list.forEach((student) => {
        const status = $(`input[name="att-${CSS.escape(student.id)}"]:checked`)?.value || "Present";
        Attendance.mark(date, student.id, status);
      });
      Notifications.add("attendance", "Attendance recorded", `${list.length} student record(s) · ${date}`);
      toast("Attendance saved.");
      renderAttendance(); renderDashboard();
    } catch (error) { toast(error.message, "error"); }
  });

  $("#add-course-btn").addEventListener("click", () => courseForm());
  $("#add-exam-btn").addEventListener("click", examForm);
  $("#result-search").addEventListener("input", renderResults);
  $("#result-course-filter").addEventListener("change", renderResults);
  $("#result-exam-filter").addEventListener("change", renderResults);
  $("#fees-search").addEventListener("input", renderFees);
  $("#fees-filter").addEventListener("change", renderFees);
  $("#add-fee-record-btn").addEventListener("click", feeRecordForm);
  $("#report-from").addEventListener("change", renderReports);
  $("#report-to").addEventListener("change", renderReports);
  $("#report-course-filter").addEventListener("change", renderReports);
  $("#print-report").addEventListener("click", () => window.print());
  $("#export-report").addEventListener("click", () => {
    let reportStudents = students();
    const from = $("#report-from").value;
    const to = $("#report-to").value;
    const course = $("#report-course-filter").value;
    if (from) reportStudents = reportStudents.filter((student) => student.admissionDate && student.admissionDate >= from);
    if (to) reportStudents = reportStudents.filter((student) => student.admissionDate && student.admissionDate <= to);
    if (course !== "All") reportStudents = reportStudents.filter((student) => student.course === course);
    const exams = Examinations.all().filter((exam) => (!from || exam.date >= from) && (!to || exam.date <= to) && (course === "All" || exam.course === course || exam.course === "All Courses"));
    const summary = Reports.summarize(reportStudents, exams);
    const feeSummary = getFeeReportSummary(course, from, to);
    const attendanceRows = Attendance.all().filter((record) => {
      const student = StudentModel.getById(record.studentId);
      return (!from || record.date >= from) && (!to || record.date <= to) && (course === "All" || student?.course === course);
    });
    const attendancePercent = attendanceRows.length
      ? Math.round(attendanceRows.filter((record) => record.status !== "Absent").length / attendanceRows.length * 100)
      : (!Attendance.all().length && !from && !to && reportStudents.length
        ? Math.round(reportStudents.reduce((sum, student) => sum + student.attendance, 0) / reportStudents.length)
        : 0);
    const rows = [
      { type: "Enrollment summary", category: "Students", value: reportStudents.length },
      ...summary.courses.map((item) => ({ type: "Course enrollment", category: item.label, value: item.value })),
      ...getMonthlyAdmissions(reportStudents).map((item) => ({ type: "Monthly admissions", category: item.label, value: item.count })),
      ...summary.grades.map((item) => ({ type: "Grade distribution", category: item.label, value: item.value })),
      ...summary.subjects.map((item) => ({ type: "Subject average", category: item.label, value: `${item.average}%` })),
      { type: "Pass/fail", category: "Passed", value: summary.passed }, { type: "Pass/fail", category: "Failed", value: summary.failed },
      { type: "Marks", category: "Average", value: summary.average },
      { type: "Attendance", category: "Recorded present / late", value: `${attendancePercent}%` },
      { type: "Fees", category: "Collected in period", value: feeSummary.collected },
      { type: "Fees", category: "Outstanding for due dates in period", value: feeSummary.pending }
    ];
    exportCSV(rows, "student-analytics.csv", ["type", "category", "value"]);
    toast("Analytics CSV exported.");
  });

  $("#mark-all-read").addEventListener("click", () => { Notifications.markAllRead(); renderNotifications(); toast("All notifications marked as read."); });
  $("#school-form").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      Settings.save({ schoolName: $("#school-name").value.trim(), adminName: $("#admin-name").value.trim(), email: $("#school-email").value.trim(), phone: $("#school-phone").value.trim() });
      renderSettings();
      toast("Institution profile saved.");
    } catch (error) { toast(error.message, "error"); }
  });
  $("#theme-toggle").addEventListener("change", (event) => {
    const config = Settings.get();
    Settings.save({ ...config, theme: event.target.checked ? "dark" : "light" });
    toast(`${event.target.checked ? "Dark" : "Light"} theme enabled.`);
  });
  $("#backup-export").addEventListener("click", () => { Settings.exportBackup(students()); toast("Portal backup exported."); });
  $("#backup-import-btn").addEventListener("click", () => $("#backup-file").click());
  $("#backup-file").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!window.confirm("Importing this backup replaces all current portal data. Continue?")) {
      event.target.value = "";
      return;
    }
    try {
      await Settings.importBackup(file);
      toast("Backup imported. Reloading portal…");
      setTimeout(() => window.location.reload(), 700);
    } catch (error) { toast(error.message, "error"); }
    event.target.value = "";
  });

  function resetAll() {
    if (!window.confirm("Restore the sample data? This replaces student records and portal data in this browser.")) return;
    StudentModel.resetToSample();
    Attendance.reset(); Courses.reset(); Examinations.reset(); Fees.reset(); Notifications.reset();
    Settings.save({ schoolName: "Scholar Academy", adminName: "Admin", email: "admin@scholar.edu", phone: "+91 9876543210", theme: "light" });
    toast("Sample data restored.");
    renderSettings(); renderDashboard();
    if (state.page === "students") renderStudents();
    if (state.page === "courses") renderCourses();
    if (state.page === "examinations") renderExaminations();
    if (state.page === "results") renderResults();
    if (state.page === "attendance") renderAttendance();
    if (state.page === "fees") renderFees();
    if (state.page === "reports") renderReports();
    if (state.page === "notifications") renderNotifications();
  }
  $("#reset-data-btn").addEventListener("click", resetAll);
  $("#settings-reset").addEventListener("click", resetAll);

  document.addEventListener("submit", (event) => {
    const formId = event.target.getAttribute("id");
    if (formId === "course-form") {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target));
      try {
        const existing = data.id && Courses.all().find((course) => course.id === data.id);
        const saved = Courses.save(data);
        if (existing && existing.name !== saved.name) {
          StudentModel.renameCourse(existing.name, saved.name);
          Examinations.renameCourse(existing.name, saved.name);
        }
        Notifications.add("info", existing ? "Course updated" : "Course created", saved.name);
        closeModal(); renderCourses(); renderResults(); renderAttendance(); renderDashboard(); toast("Course saved.");
      }
      catch (error) { toast(error.message, "error"); }
    }
    if (formId === "exam-form") {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target));
      try {
        Examinations.save(data);
        if (!data.id) Notifications.add("exam", "Examination scheduled", `${data.name} · ${data.date}`);
        closeModal(); renderExaminations(); renderResults(); renderDashboard(); toast(data.id ? "Examination updated." : "Examination created.");
      } catch (error) { toast(error.message, "error"); }
    }
    if (formId === "fee-record-form") {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target));
      try {
        Fees.setFeeRecord(data.studentId, data.total, data.dueDate);
        Notifications.add("fees", "Fee record updated", `Fee record updated for ${StudentModel.getById(data.studentId)?.name || "a student"}.`);
        closeModal(); renderFees(); renderDashboard(); toast("Fee record saved.");
      } catch (error) { toast(error.message, "error"); }
    }
    if (formId === "exam-marks-form") {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target));
      try {
        Examinations.recordMark(data.examId, data.studentId, data.marks);
        const student = StudentModel.getById(data.studentId);
        const exam = Examinations.all().find((item) => item.id === data.examId);
        Notifications.add("exam", "Examination result updated", `${student?.name || "Student"} · ${exam?.name || "Examination"}`);
        closeModal(); renderExaminations(); renderResults(); renderDashboard(); toast("Student result saved.");
      } catch (error) { toast(error.message, "error"); }
    }
    if (formId === "payment-form") {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target));
      try {
        Fees.addPayment(data.studentId, data.amount, data.method);
        Notifications.add("fees", "Fee payment received", `A payment was recorded for ${StudentModel.getById(data.studentId)?.name || "a student"}.`);
        closeModal(); renderFees(); renderDashboard(); toast("Payment recorded.");
      } catch (error) { toast(error.message, "error"); }
    }
    if (formId === "due-date-form") {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target));
      try { Fees.setDueDate(data.studentId, data.dueDate); Notifications.add("fees", "Fee due date updated", `${StudentModel.getById(data.studentId)?.name || "Student"} · ${data.dueDate}`); closeModal(); renderFees(); toast("Fee due date updated."); }
      catch (error) { toast(error.message, "error"); }
    }
  });

  ["dashboard", "students", "add", "attendance", "courses", "examinations", "results", "fees", "reports", "notifications", "settings", "about"].forEach((page) => {
    if (!pageTitles[page]) throw new Error(`Missing page title for ${page}`);
  });
  Settings.applyTheme();
  renderSettings();
  navigate("dashboard");
});
