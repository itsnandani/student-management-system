const Attendance = (() => {
  let records = DataStore.loadCollection("attendance", []);
  const all = () => records.map((record) => ({ ...record }));
  function mark(date, studentId, status) {
    if (!date || !studentId || !["Present", "Absent", "Late"].includes(status)) throw new Error("Choose a valid date, student and attendance status.");
    const existing = records.find((record) => record.date === date && record.studentId === studentId);
    if (existing) existing.status = status;
    else records.push({ id: `ATT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date, studentId, status });
    DataStore.saveCollection("attendance", records);
  }
  function getForDate(date) { return records.filter((record) => record.date === date); }
  function getHistory({ date = "", studentId = "" } = {}) {
    return records.filter((record) => (!date || record.date === date) && (!studentId || record.studentId === studentId))
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  function getPercentage(studentId) {
    const entries = records.filter((record) => record.studentId === studentId);
    if (!entries.length) return null;
    return Math.round(entries.filter((record) => record.status !== "Absent").length / entries.length * 100);
  }
  function removeForStudent(studentId) {
    records = records.filter((record) => record.studentId !== studentId);
    DataStore.saveCollection("attendance", records);
  }
  function reset() { records = []; DataStore.saveCollection("attendance", records); }
  return { all, mark, getForDate, getHistory, getPercentage, removeForStudent, reset };
})();
