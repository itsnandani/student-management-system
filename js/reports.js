const Reports = (() => {
  function summarize(students, examinations = []) {
    const gradeOrder = ["A+", "A", "B", "C", "D", "F"];
    const grades = Object.fromEntries(gradeOrder.map((grade) => [grade, 0]));
    const courses = {};
    const subjects = {};
    students.forEach((student) => {
      const grade = StudentModel.calculateGrade(student.marks);
      grades[grade] += 1;
      courses[student.course] = (courses[student.course] || 0) + 1;
    });
    examinations.forEach((exam) => Object.entries(exam.marks || {}).forEach(([, marks]) => {
      if (!subjects[exam.subject]) subjects[exam.subject] = { sum: 0, count: 0 };
      subjects[exam.subject].sum += marks / exam.maxMarks * 100;
      subjects[exam.subject].count += 1;
    }));
    const pass = students.filter((student) => student.marks >= 40).length;
    return {
      grades: gradeOrder.map((grade) => ({ label: grade, value: grades[grade] })),
      courses: Object.entries(courses).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
      subjects: Object.entries(subjects).map(([label, result]) => ({
        label,
        average: Math.round(result.sum / result.count * 10) / 10
      })).sort((a, b) => b.average - a.average),
      passed: pass,
      failed: students.length - pass,
      average: students.length ? Math.round(students.reduce((sum, student) => sum + student.marks, 0) / students.length * 10) / 10 : 0
    };
  }
  return { summarize };
})();
