/* ============================================================
   students.js
   The "model" layer: owns the in-memory student array, all
   CRUD operations, grade calculation and validation logic.
   Nothing in here touches the DOM directly.
   ============================================================ */

const StudentModel = (() => {
  // In-memory copy of the student records, loaded from DataStore
  let students = DataStore.load();

  /* ---------- Grade calculation ---------- */

  /**
   * Converts a numeric mark into a letter grade.
   * @param {number} marks 0-100
   * @returns {string} letter grade
   */
  function calculateGrade(marks) {
    if (marks >= 90) return "A+";
    if (marks >= 80) return "A";
    if (marks >= 70) return "B";
    if (marks >= 60) return "C";
    if (marks >= 50) return "D";
    return "F";
  }

  /**
   * Determines pass/fail status from marks.
   * Passing mark is 40 and above.
   * @param {number} marks
   * @returns {"Pass"|"Fail"}
   */
  function calculatePassFail(marks) {
    return marks >= 40 ? "Pass" : "Fail";
  }

  /* ---------- Validation ---------- */

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Accepts digits, spaces, dashes, parentheses and an optional leading +
  const PHONE_REGEX = /^\+91[\s-]?[6-9]\d{9}$/;

  /**
   * Validates a student form payload.
   * @param {Object} data
   * @param {string} [excludeId] id to exclude when checking duplicates (edit mode)
   * @returns {{valid: boolean, errors: Object<string,string>}}
   */
  function validateStudent(data, excludeId = null) {
    const errors = {};

    if (!data.name || !data.name.trim()) {
      errors.name = "Full name is required.";
    }

    if (!data.studentCode || !data.studentCode.trim()) {
      errors.studentCode = "Student ID is required.";
    } else if (isDuplicateId(data.studentCode.trim(), excludeId)) {
      errors.studentCode = "This student ID is already in use.";
    }

    if (!data.roll || !data.roll.trim()) {
      errors.roll = "Roll number is required.";
    } else if (isDuplicateRoll(data.roll.trim(), excludeId)) {
      errors.roll = "This roll number is already in use.";
    }

    if (!data.email || !data.email.trim()) {
      errors.email = "Email is required.";
    } else if (!EMAIL_REGEX.test(data.email.trim())) {
      errors.email = "Enter a valid email address.";
    }

    if (!data.phone || !data.phone.trim()) {
      errors.phone = "Phone number is required.";
    } else if (!PHONE_REGEX.test(data.phone.trim())) {
      errors.phone = "Enter a valid Indian phone number starting with +91.";
    }

    if (data.guardianPhone && !PHONE_REGEX.test(data.guardianPhone.trim())) {
      errors.guardianPhone = "Enter a valid Indian guardian phone number starting with +91.";
    }

    if (!data.course || !data.course.trim()) {
      errors.course = "Course is required.";
    }

    if (!data.semester || !data.semester.toString().trim()) {
      errors.semester = "Semester is required.";
    }

    const marksNum = Number(data.marks);
    if (data.marks === "" || data.marks === null || data.marks === undefined) {
      errors.marks = "Marks are required.";
    } else if (Number.isNaN(marksNum) || marksNum < 0 || marksNum > 100) {
      errors.marks = "Marks must be a number between 0 and 100.";
    }

    const attendanceNum = Number(data.attendance);
    if (data.attendance === "" || data.attendance === null || data.attendance === undefined) {
      errors.attendance = "Attendance is required.";
    } else if (Number.isNaN(attendanceNum) || attendanceNum < 0 || attendanceNum > 100) {
      errors.attendance = "Attendance must be a number between 0 and 100.";
    }

    if (!["Active", "Inactive"].includes(data.status)) {
      errors.status = "Choose a valid student status.";
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }

  function isDuplicateRoll(roll, excludeId) {
    return students.some(
      (s) => s.roll.toLowerCase() === roll.toLowerCase() && s.id !== excludeId
    );
  }

  function isDuplicateId(id, excludeId = null) {
    return students.some((s) => s.id.toLowerCase() === id.toLowerCase() && s.id !== excludeId);
  }

  /**
   * Generates a new unique student ID in the form STUxxxx.
   */
  function generateId() {
    let maxNum = 1000;
    students.forEach((s) => {
      const match = /^STU(\d+)$/.exec(s.id);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    let candidate = `STU${maxNum + 1}`;
    // Safety net in case of manual data edits causing a collision
    while (isDuplicateId(candidate)) {
      maxNum += 1;
      candidate = `STU${maxNum + 1}`;
    }
    return candidate;
  }

  /* ---------- CRUD ---------- */

  /**
   * Returns a shallow copy of all students (callers should not
   * mutate this array directly; use the CRUD methods instead).
   */
  function getAll() {
    return [...students];
  }

  function getById(id) {
    return students.find((s) => s.id === id) || null;
  }

  /**
   * Adds a new student. Expects already-validated data.
   * @param {Object} data
   * @returns {Object} the created student record
   */
  function addStudent(data) {
    const newStudent = {
      id: data.studentCode && data.studentCode.trim() ? data.studentCode.trim() : generateId(),
      name: data.name.trim(),
      roll: data.roll.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      gender: (data.gender || "").trim(),
      dob: data.dob || "",
      address: (data.address || "").trim(),
      city: (data.city || "").trim(),
      state: (data.state || "").trim(),
      photo: (data.photo || "").trim(),
      department: (data.department || "").trim(),
      admissionDate: data.admissionDate || "",
      guardian: (data.guardian || "").trim(),
      guardianPhone: (data.guardianPhone || "").trim(),
      relationship: (data.relationship || "").trim(),
      course: data.course.trim(),
      semester: data.semester.toString().trim(),
      marks: Number(data.marks),
      attendance: Number(data.attendance),
      status: data.status
    };
    students.push(newStudent);
    DataStore.save(students);
    return newStudent;
  }

  /**
   * Updates an existing student by id. Expects already-validated data.
   * @param {string} id
   * @param {Object} data
   * @returns {Object|null} the updated record, or null if not found
   */
  function updateStudent(id, data) {
    const index = students.findIndex((s) => s.id === id);
    if (index === -1) return null;

    students[index] = {
      ...students[index],
      name: data.name.trim(),
      roll: data.roll.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      gender: (data.gender || "").trim(),
      dob: data.dob || "",
      address: (data.address || "").trim(),
      city: (data.city || "").trim(),
      state: (data.state || "").trim(),
      photo: (data.photo || "").trim(),
      department: (data.department || "").trim(),
      admissionDate: data.admissionDate || "",
      guardian: (data.guardian || "").trim(),
      guardianPhone: (data.guardianPhone || "").trim(),
      relationship: (data.relationship || "").trim(),
      course: data.course.trim(),
      semester: data.semester.toString().trim(),
      marks: Number(data.marks),
      attendance: Number(data.attendance),
      status: data.status
    };
    DataStore.save(students);
    return students[index];
  }

  /**
   * Deletes a student by id.
   * @param {string} id
   * @returns {boolean} true if a record was removed
   */
  function deleteStudent(id) {
    const before = students.length;
    students = students.filter((s) => s.id !== id);
    DataStore.save(students);
    return students.length < before;
  }

  function renameCourse(previousName, nextName) {
    let changed = false;
    students = students.map((student) => {
      if (student.course !== previousName) return student;
      changed = true;
      return { ...student, course: nextName };
    });
    if (changed) DataStore.save(students);
  }

  /**
   * Restores the sample dataset and reloads the in-memory array.
   */
  function resetToSample() {
    students = DataStore.resetToSample();
    return getAll();
  }

  /* ---------- Search / Filter / Sort ---------- */

  /**
   * Returns students matching a free-text search across
   * name, roll number, id and email.
   */
  function search(query, list = students) {
    const q = query.trim().toLowerCase();
    if (!q) return [...list];
    return list.filter((s) =>
      [s.name, s.roll, s.id, s.email, s.phone, s.course, s.department, s.city, s.state].some((field) =>
        String(field || "").toLowerCase().includes(q)
      )
    );
  }

  /** Filters by exact course match ("All" returns everything). */
  function filterByCourse(course, list = students) {
    if (!course || course === "All") return [...list];
    return list.filter((s) => s.course === course);
  }

  /** Filters by exact status match ("All" returns everything). */
  function filterByStatus(status, list = students) {
    if (!status || status === "All") return [...list];
    return list.filter((s) => s.status === status);
  }

  /**
   * Sorts a list of students by a given field.
   * @param {Array<Object>} list
   * @param {string} field one of name|roll|marks|attendance|course
   * @param {"asc"|"desc"} direction
   */
  function sortBy(list, field, direction = "asc") {
    const sorted = [...list].sort((a, b) => {
      let valA = a[field];
      let valB = b[field];

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }

  /** Returns the distinct list of courses currently in use. */
  function getCourses() {
    const unique = new Set(students.map((s) => s.course));
    return [...unique].sort();
  }

  return {
    getAll,
    getById,
    addStudent,
    updateStudent,
    deleteStudent,
    renameCourse,
    resetToSample,
    validateStudent,
    calculateGrade,
    calculatePassFail,
    search,
    filterByCourse,
    filterByStatus,
    sortBy,
    getCourses,
    getNextId: generateId
  };
})();
