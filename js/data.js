/* ============================================================
   data.js
   Handles sample data, LocalStorage persistence, and the
   in-memory "database" that the rest of the app reads/writes.
   ============================================================ */

const STORAGE_KEY = "smsStudents";
const PORTAL_KEYS = {
  attendance: "smsAttendance",
  courses: "smsCourses",
  examinations: "smsExaminations",
  fees: "smsFees",
  notifications: "smsNotifications",
  settings: "smsSettings"
};
const sampleDate = (offsetDays) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const sampleTimestamp = (offsetDays) => new Date(Date.now() + offsetDays * 86400000).toISOString();

/* Fictional Indian demonstration records with reserved example.com email addresses. */
const SAMPLE_STUDENT_NAMES = [
  "Saheb Sheikh", "Ruchika Kumari", "Nandani Kumari", "Priya", "Tanmoy Maiti",
  "Aditya", "Nikhil Raj", "Rohit", "Monoj", "Sam", "Ariyan", "Aman",
  "Sayan Das", "Sneha Kumari", "Arpita Das", "Sourav Roy", "Ankita Kumari",
  "Debjit", "Riya Sharma", "Abhishek Kumar"
];
const SAMPLE_COURSE_NAMES = [
  "Computer Science", "Cyber Security", "Mechanical Engineering",
  "Electrical Engineering", "Business Administration"
];
const SAMPLE_CITIES = [
  ["Kolkata", "West Bengal"], ["Darbhanga", "Bihar"], ["Patna", "Bihar"],
  ["Delhi", "Delhi"], ["Mumbai", "Maharashtra"], ["Bengaluru", "Karnataka"]
];
const SAMPLE_MARKS = [92, 88, 77, 65, 58, 43, 97, 39, 72, 81, 55, 68, 91, 47, 84, 76, 62, 33, 95, 70];
const SAMPLE_ATTENDANCE_VALUES = [95, 88, 91, 82, 97, 74, 99, 55, 86, 93, 79, 89, 96, 72, 91, 85, 90, 60, 98, 87];
const SAMPLE_GUARDIANS = [
  "Arif Sheikh", "Sunita Kumari", "Rajesh Kumari", "Anita Das", "Pradip Maiti",
  "Meena", "Ramesh Raj", "Sanjay", "Mohan", "Rita", "Sujit", "Kavita",
  "Bikash Das", "Suresh Kumari", "Anup Das", "Mita Roy", "Subhash Kumari",
  "Ranjit", "Vijay Sharma", "Pankaj Kumar"
];
const SAMPLE_STUDENTS = SAMPLE_STUDENT_NAMES.map((name, index) => {
  const [city, state] = SAMPLE_CITIES[index % SAMPLE_CITIES.length];
  const slug = name.toLowerCase().replace(/\s+/g, ".");
  const course = SAMPLE_COURSE_NAMES[index % SAMPLE_COURSE_NAMES.length];
  return {
    id: `STU${1001 + index}`,
    name,
    roll: `STU${1001 + index}`,
    email: `${slug}@example.com`,
    phone: `+91 90000${String(10001 + index).slice(-5)}`,
    gender: index % 3 === 0 ? "Female" : "Male",
    dob: `200${index % 6 + 1}-${String(index % 12 + 1).padStart(2, "0")}-${String(index % 27 + 1).padStart(2, "0")}`,
    address: `Student Lane, ${city}`,
    city,
    state,
    course,
    department: course === "Business Administration" ? "Business" : ["Computer Science", "Cyber Security"].includes(course) ? "Technology" : "Engineering",
    semester: String(index % 8 + 1),
    admissionDate: `202${index % 4 + 2}-${String(index % 12 + 1).padStart(2, "0")}-15`,
    guardian: SAMPLE_GUARDIANS[index],
    guardianPhone: `+91 91000${String(10001 + index).slice(-5)}`,
    relationship: index % 2 === 0 ? "Parent" : "Guardian",
    marks: SAMPLE_MARKS[index],
    attendance: SAMPLE_ATTENDANCE_VALUES[index],
    status: index === 7 || index === 17 ? "Inactive" : "Active"
  };
});

const SAMPLE_COURSES = [
  { id: "CRS-01", name: "Computer Science", department: "Technology", duration: "4 years", semester: "1–8", description: "Programming, software engineering and intelligent systems." },
  { id: "CRS-02", name: "Cyber Security", department: "Technology", duration: "4 years", semester: "1–8", description: "Secure computing, network defense and digital forensics." },
  { id: "CRS-03", name: "Mechanical Engineering", department: "Engineering", duration: "4 years", semester: "1–8", description: "Design, manufacturing and mechanical systems." },
  { id: "CRS-04", name: "Electrical Engineering", department: "Engineering", duration: "4 years", semester: "1–8", description: "Electrical systems, electronics and energy." },
  { id: "CRS-05", name: "Business Administration", department: "Business", duration: "3 years", semester: "1–6", description: "Management, finance and entrepreneurial leadership." }
];

const SAMPLE_EXAMINATIONS = [
  { id: "EX-01", name: "Midterm Assessment", subject: "Programming", date: sampleDate(14), course: "Computer Science", maxMarks: 100, marks: { STU1001: 92, STU1006: 43, STU1011: 55, STU1016: 76 } },
  { id: "EX-02", name: "Final Examination", subject: "Digital Security", date: sampleDate(31), course: "Cyber Security", maxMarks: 100, marks: { STU1002: 88, STU1007: 97, STU1012: 68, STU1017: 62 } }
];

const SAMPLE_NOTIFICATIONS = [
  { id: "NT-01", type: "exam", title: "Examination schedule published", message: "The upcoming midterm assessment is scheduled soon.", date: sampleTimestamp(-1), read: false },
  { id: "NT-02", type: "fees", title: "Fee payment reminder", message: "Review student fee balances and upcoming due dates.", date: sampleTimestamp(-2), read: false },
  { id: "NT-03", type: "attendance", title: "Attendance overview ready", message: "This week's attendance summary is available in the portal.", date: sampleTimestamp(-3), read: true }
];

const SAMPLE_FEES = SAMPLE_STUDENTS.map((student, index) => ({
  studentId: student.id,
  total: 45000 + (index % 3) * 5000,
  paid: [45000, 30000, 55000, 20000, 50000, 25000, 45000, 10000, 50000, 35000, 45000, 20000, 35000, 15000, 50000, 35000, 45000, 5000, 40000, 30000][index],
  dueDate: index % 4 === 1 ? sampleDate(-7) : sampleDate(30),
  payments: [{ amount: [45000, 30000, 55000, 20000, 50000, 25000, 45000, 10000, 50000, 35000, 45000, 20000, 35000, 15000, 50000, 35000, 45000, 5000, 40000, 30000][index], date: sampleDate(-30), method: "UPI" }]
}));

/**
 * DataStore
 * Small wrapper around LocalStorage so the rest of the app
 * never talks to localStorage directly. Keeps persistence
 * logic in one place and handles corrupted/missing data safely.
 */
const DataStore = (() => {
  /**
   * Reads the student list from LocalStorage.
   * Falls back to sample data if nothing is stored yet,
   * and falls back safely if the stored value is corrupted.
   * @returns {Array<Object>} list of student objects
   */
  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw === null) {
      // First launch: seed with sample data
      save(SAMPLE_STUDENTS);
      return clone(SAMPLE_STUDENTS);
    }

    try {
      const parsed = JSON.parse(raw);
      const requiredFields = [
        "id", "name", "roll", "email", "phone", "course",
        "semester", "marks", "attendance", "status"
      ];
      const validStatuses = new Set(["Active", "Inactive"]);
      const isValidStudent = (student) =>
        student !== null &&
        typeof student === "object" &&
        !Array.isArray(student) &&
        requiredFields.every((field) =>
          Object.prototype.hasOwnProperty.call(student, field)
        ) &&
        requiredFields
          .filter((field) => !["marks", "attendance"].includes(field))
          .every((field) => typeof student[field] === "string") &&
        student.id.trim() !== "" &&
        student.name.trim() !== "" &&
        student.roll.trim() !== "" &&
        student.email.trim() !== "" &&
        student.course.trim() !== "" &&
        Number.isFinite(student.marks) &&
        student.marks >= 0 &&
        student.marks <= 100 &&
        Number.isFinite(student.attendance) &&
        student.attendance >= 0 &&
        student.attendance <= 100 &&
        validStatuses.has(student.status);

      if (!Array.isArray(parsed) || !parsed.every(isValidStudent)) {
        throw new Error("Stored student data has an invalid structure");
      }
      const ids = new Set(parsed.map((student) => student.id));
      const rolls = new Set(parsed.map((student) => student.roll.toLowerCase()));
      if (ids.size !== parsed.length || rolls.size !== parsed.length) {
        throw new Error("Stored student data contains duplicate IDs or roll numbers");
      }
      return parsed;
    } catch (err) {
      // Corrupted data: reset safely to sample data rather than crash
      console.warn("Corrupted LocalStorage data detected. Resetting to sample data.", err);
      save(SAMPLE_STUDENTS);
      return clone(SAMPLE_STUDENTS);
    }
  }

  /**
   * Persists the given student list to LocalStorage.
   * @param {Array<Object>} students
   */
  function save(students) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    } catch (err) {
      console.error("Failed to save data to LocalStorage.", err);
    }
  }

  /**
   * Restores the sample dataset, overwriting whatever is stored.
   * @returns {Array<Object>} the restored sample data
   */
  function resetToSample() {
    save(SAMPLE_STUDENTS);
    return clone(SAMPLE_STUDENTS);
  }

  function loadCollection(name, fallback) {
    const key = PORTAL_KEYS[name];
    if (!key) throw new Error(`Unknown portal collection: ${name}`);
    const raw = localStorage.getItem(key);
    if (raw === null) {
      saveCollection(name, fallback);
      return clone(fallback);
    }
    try {
      const parsed = JSON.parse(raw);
      if (!isValidCollection(name, parsed)) throw new Error(`Invalid ${name} data`);
      return parsed;
    } catch (error) {
      console.warn(`Invalid ${name} data found. Restoring defaults.`, error);
      saveCollection(name, fallback);
      return clone(fallback);
    }
  }

  function isValidCollection(name, value) {
    const isObject = (item) => item !== null && typeof item === "object" && !Array.isArray(item);
    if (name === "settings") {
      return isObject(value) &&
        typeof value.schoolName === "string" &&
        typeof value.adminName === "string" &&
        typeof value.email === "string" &&
        typeof value.phone === "string" &&
        ["light", "dark"].includes(value.theme);
    }
    if (!Array.isArray(value)) return false;
    if (name === "attendance") {
      return value.every((item) => isObject(item) && typeof item.id === "string" &&
        typeof item.studentId === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
        ["Present", "Absent", "Late"].includes(item.status));
    }
    if (name === "courses") {
      return value.every((item) => isObject(item) && ["id", "name", "department", "duration", "description"].every((key) => typeof item[key] === "string") &&
        (item.semester === undefined || typeof item.semester === "string"));
    }
    if (name === "examinations") {
      return value.every((item) => isObject(item) && typeof item.id === "string" &&
        typeof item.name === "string" && typeof item.subject === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.date) && typeof item.course === "string" &&
        Number.isFinite(item.maxMarks) && item.maxMarks > 0 &&
        (item.marks === undefined || (isObject(item.marks) && Object.values(item.marks).every((mark) => Number.isFinite(mark) && mark >= 0 && mark <= item.maxMarks))));
    }
    if (name === "fees") {
      return value.every((item) => isObject(item) && typeof item.studentId === "string" &&
        Number.isFinite(item.total) && item.total > 0 && Number.isFinite(item.paid) &&
        item.paid >= 0 && item.paid <= item.total && typeof item.dueDate === "string" &&
        Array.isArray(item.payments) && item.payments.every((payment) => isObject(payment) &&
          Number.isFinite(payment.amount) && payment.amount > 0 && typeof payment.date === "string" && typeof payment.method === "string"));
    }
    if (name === "notifications") {
      return value.every((item) => isObject(item) && typeof item.id === "string" &&
        typeof item.type === "string" && typeof item.title === "string" &&
        typeof item.message === "string" && typeof item.date === "string" && typeof item.read === "boolean");
    }
    return false;
  }

  function saveCollection(name, value) {
    const key = PORTAL_KEYS[name];
    if (!key) throw new Error(`Unknown portal collection: ${name}`);
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Failed to save ${name} to LocalStorage.`, error);
      return false;
    }
  }

  function resetPortalData() {
    save(SAMPLE_STUDENTS);
    Object.entries({
      attendance: [],
      courses: SAMPLE_COURSES,
      examinations: SAMPLE_EXAMINATIONS,
      fees: SAMPLE_FEES,
      notifications: SAMPLE_NOTIFICATIONS,
      settings: { schoolName: "Scholar Academy", adminName: "Admin", email: "admin@scholar.edu", phone: "+91 9876543210", theme: "light" }
    }).forEach(([name, value]) => saveCollection(name, value));
    return true;
  }

  function exportSnapshot(students) {
    const snapshot = { version: 1, exportedAt: new Date().toISOString(), students };
    Object.keys(PORTAL_KEYS).forEach((name) => {
      const raw = localStorage.getItem(PORTAL_KEYS[name]);
      snapshot[name] = raw === null ? (name === "settings" ? {} : []) : JSON.parse(raw);
    });
    return snapshot;
  }

  function importSnapshot(snapshot) {
    if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.students)) {
      throw new Error("Backup file format is not supported.");
    }
    const validStudents = snapshot.students.every((student) =>
      student && typeof student.id === "string" && student.id.trim() !== "" &&
      typeof student.name === "string" && student.name.trim() !== "" &&
      typeof student.roll === "string" && student.roll.trim() !== "" &&
      typeof student.email === "string" && typeof student.phone === "string" &&
      typeof student.course === "string" && typeof student.semester === "string" &&
      ["Active", "Inactive"].includes(student.status) &&
      Number.isFinite(student.marks) && student.marks >= 0 && student.marks <= 100 &&
      Number.isFinite(student.attendance) && student.attendance >= 0 && student.attendance <= 100
    );
    if (!validStudents) throw new Error("Backup contains invalid student records.");
    const ids = new Set(snapshot.students.map((student) => student.id));
    const rolls = new Set(snapshot.students.map((student) => student.roll.toLowerCase()));
    if (ids.size !== snapshot.students.length || rolls.size !== snapshot.students.length) {
      throw new Error("Backup contains duplicate student IDs or roll numbers.");
    }
    Object.keys(PORTAL_KEYS).forEach((name) => {
      if (!isValidCollection(name, snapshot[name])) throw new Error(`Backup contains invalid ${name} data.`);
    });
    save(snapshot.students);
    Object.keys(PORTAL_KEYS).forEach((name) => saveCollection(name, snapshot[name]));
  }

  /**
   * Deep-clones a plain JSON-serializable value.
   * Used so callers never accidentally mutate SAMPLE_STUDENTS.
   */
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  return {
    load,
    save,
    resetToSample,
    loadCollection,
    saveCollection,
    resetPortalData,
    exportSnapshot,
    importSnapshot
  };
})();
