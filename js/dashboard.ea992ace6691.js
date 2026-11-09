/* ============================================================
   dashboard.js
   Pure calculation helpers for the Dashboard and Reports pages.
   Takes a student array in, returns plain numbers/objects out —
   no DOM access here, so these are easy to reason about and reuse.
   ============================================================ */

const Dashboard = (() => {
  /**
   * Computes the headline dashboard statistics.
   * @param {Array<Object>} students
   */
  function getStats(students) {
    const total = students.length;
    const active = students.filter((s) => s.status === "Active").length;

    const passed = students.filter(
      (s) => StudentModel.calculatePassFail(s.marks) === "Pass"
    ).length;
    const failed = total - passed;

    const avgMarks = total
      ? students.reduce((sum, s) => sum + s.marks, 0) / total
      : 0;

    return {
      total,
      active,
      inactive: total - active,
      passed,
      failed,
      avgMarks: Math.round(avgMarks * 10) / 10
    };
  }

  /**
   * Returns the N most recently added students (by insertion order,
   * since array push order reflects creation order).
   */
  function getRecent(students, count = 5) {
    return students.slice(-count).reverse();
  }

  /**
   * Counts students per course.
   * @returns {Array<{course: string, count: number}>}
   */
  function getCourseDistribution(students) {
    const map = {};
    students.forEach((s) => {
      map[s.course] = (map[s.course] || 0) + 1;
    });
    return Object.entries(map)
      .map(([course, count]) => ({ course, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Counts students per letter grade, A+ through F, in a fixed order.
   * @returns {Array<{grade: string, count: number}>}
   */
  function getGradeDistribution(students) {
    const order = ["A+", "A", "B", "C", "D", "F"];
    const map = Object.fromEntries(order.map((g) => [g, 0]));
    students.forEach((s) => {
      const grade = StudentModel.calculateGrade(s.marks);
      map[grade] += 1;
    });
    return order.map((grade) => ({ grade, count: map[grade] }));
  }

  /**
   * Returns pass/fail counts and percentages.
   */
  function getPassFailStats(students) {
    const total = students.length;
    const passed = students.filter(
      (s) => StudentModel.calculatePassFail(s.marks) === "Pass"
    ).length;
    const failed = total - passed;

    return {
      passed,
      failed,
      passPct: total ? Math.round((passed / total) * 100) : 0,
      failPct: total ? Math.round((failed / total) * 100) : 0
    };
  }

  /**
   * Average marks, overall.
   */
  function getAverageMarks(students) {
    if (!students.length) return 0;
    const sum = students.reduce((acc, s) => acc + s.marks, 0);
    return Math.round((sum / students.length) * 10) / 10;
  }

  return {
    getStats,
    getRecent,
    getCourseDistribution,
    getGradeDistribution,
    getPassFailStats,
    getAverageMarks
  };
})();
