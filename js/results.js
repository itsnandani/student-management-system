const Results = (() => {
  function getRows(students, examinations) {
    const rows = [];
    students.forEach((student) => {
      const studentExams = examinations.filter((exam) => exam.marks && exam.marks[student.id] !== undefined);
      if (!studentExams.length) {
        rows.push(makeRow(student, "Current average", "Overall", student.marks, 100));
        return;
      }
      studentExams.forEach((exam) => rows.push(makeRow(
        student, exam.name, exam.subject, exam.marks[student.id], exam.maxMarks, exam.id
      )));
    });
    return rows;
  }

  function makeRow(student, examination, subject, marks, maximum, examId = "") {
    const percentage = maximum ? marks / maximum * 100 : 0;
    return {
      student,
      examination,
      subject,
      examId,
      marks,
      maximum,
      percentage: Math.round(percentage * 10) / 10,
      grade: StudentModel.calculateGrade(percentage),
      result: StudentModel.calculatePassFail(percentage)
    };
  }

  return { getRows };
})();
