const Examinations = (() => {
  let items = DataStore.loadCollection("examinations", SAMPLE_EXAMINATIONS);
  const all = () => items.map((item) => ({ ...item, marks: { ...(item.marks || {}) } }));
  function save(exam) {
    const name = String(exam.name || "").trim();
    const maxMarks = Number(exam.maxMarks);
    if (!name || !exam.date || !exam.subject || !Number.isFinite(maxMarks) || maxMarks <= 0) throw new Error("Enter an examination name, subject, date and valid maximum marks.");
    const existing = items.find((item) => item.id === exam.id);
    const marks = exam.marks || existing?.marks || {};
    if (Object.values(marks).some((mark) => mark > maxMarks)) throw new Error("Maximum marks cannot be lower than a mark already recorded.");
    const next = { id: exam.id || `EX-${Date.now()}`, name, subject: String(exam.subject).trim(), date: exam.date, course: exam.course || "All Courses", maxMarks, marks: { ...marks } };
    const index = items.findIndex((item) => item.id === next.id);
    if (index < 0) items.push(next);
    else items[index] = next;
    DataStore.saveCollection("examinations", items);
    return next;
  }
  function remove(id) { items = items.filter((item) => item.id !== id); DataStore.saveCollection("examinations", items); }
  function removeStudentMarks(studentId) {
    let changed = false;
    items.forEach((exam) => {
      if (exam.marks && Object.prototype.hasOwnProperty.call(exam.marks, studentId)) {
        delete exam.marks[studentId];
        changed = true;
      }
    });
    if (changed) DataStore.saveCollection("examinations", items);
  }
  function renameCourse(previousName, nextName) {
    let changed = false;
    items = items.map((exam) => {
      if (exam.course !== previousName) return exam;
      changed = true;
      return { ...exam, course: nextName };
    });
    if (changed) DataStore.saveCollection("examinations", items);
  }
  function recordMark(examId, studentId, rawMarks) {
    const exam = items.find((item) => item.id === examId);
    const mark = Number(rawMarks);
    if (!exam || rawMarks === "" || !Number.isFinite(mark) || mark < 0 || mark > exam.maxMarks) throw new Error("Marks must be between zero and the examination maximum.");
    exam.marks = exam.marks || {};
    exam.marks[studentId] = mark;
    DataStore.saveCollection("examinations", items);
  }
  function reset() { items = [...SAMPLE_EXAMINATIONS]; DataStore.saveCollection("examinations", items); }
  return { all, save, remove, removeStudentMarks, renameCourse, recordMark, reset };
})();
