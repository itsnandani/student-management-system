const Courses = (() => {
  let items = DataStore.loadCollection("courses", SAMPLE_COURSES);
  const all = () => items.map((item) => ({ ...item }));
  function save(course) {
    const name = String(course.name || "").trim();
    if (!name) throw new Error("Course name is required.");
    if (items.some((item) => item.name.toLowerCase() === name.toLowerCase() && item.id !== course.id)) throw new Error("A course with that name already exists.");
    const next = {
      id: course.id || `CRS-${Date.now()}`,
      name,
      department: String(course.department || "").trim(),
      duration: String(course.duration || "").trim(),
      semester: String(course.semester || "").trim(),
      description: String(course.description || "").trim()
    };
    const index = items.findIndex((item) => item.id === next.id);
    if (index < 0) items.push(next);
    else items[index] = next;
    DataStore.saveCollection("courses", items);
    return next;
  }
  function remove(id) { items = items.filter((item) => item.id !== id); DataStore.saveCollection("courses", items); }
  function reset() { items = [...SAMPLE_COURSES]; DataStore.saveCollection("courses", items); }
  return { all, save, remove, reset };
})();
