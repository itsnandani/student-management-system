const Fees = (() => {
  let items = DataStore.loadCollection("fees", SAMPLE_FEES);
  const all = () => items.map((item) => ({ ...item, payments: (item.payments || []).map((payment) => ({ ...payment })) }));
  function forStudent(studentId) {
    let record = items.find((item) => item.studentId === studentId);
    if (!record) {
      record = { studentId, total: 45000, paid: 0, dueDate: "2026-11-30", payments: [] };
      items.push(record);
      DataStore.saveCollection("fees", items);
    }
    return { ...record, payments: [...(record.payments || [])] };
  }
  function addPayment(studentId, amount, method = "Cash") {
    const record = forStudent(studentId);
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || value > record.total - record.paid) throw new Error("Payment must be greater than zero and cannot exceed the outstanding balance.");
    record.paid += value;
    record.payments.push({ amount: value, date: new Date().toISOString().slice(0, 10), method });
    items = items.map((item) => item.studentId === studentId ? record : item);
    DataStore.saveCollection("fees", items);
    return record;
  }
  function setDueDate(studentId, dueDate) {
    if (!dueDate) throw new Error("Choose a due date.");
    const record = forStudent(studentId);
    record.dueDate = dueDate;
    items = items.map((item) => item.studentId === studentId ? record : item);
    DataStore.saveCollection("fees", items);
  }
  function setFeeRecord(studentId, total, dueDate) {
    const record = forStudent(studentId);
    const amount = Number(total);
    if (!Number.isFinite(amount) || amount <= 0 || amount < record.paid) {
      throw new Error("Total fees must be positive and cannot be less than the amount already paid.");
    }
    if (!dueDate) throw new Error("Choose a due date.");
    record.total = amount;
    record.dueDate = dueDate;
    items = items.map((item) => item.studentId === studentId ? record : item);
    DataStore.saveCollection("fees", items);
    return record;
  }
  function getSummary() {
    const total = items.reduce((sum, item) => sum + item.total, 0);
    const paid = items.reduce((sum, item) => sum + item.paid, 0);
    const overdue = items.filter((item) => item.paid < item.total && item.dueDate < new Date().toISOString().slice(0, 10))
      .reduce((sum, item) => sum + item.total - item.paid, 0);
    const transactions = items.reduce((sum, item) => sum + item.payments.length, 0);
    return { total, paid, pending: Math.max(0, total - paid), overdue, transactions };
  }
  function removeForStudent(studentId) {
    items = items.filter((item) => item.studentId !== studentId);
    DataStore.saveCollection("fees", items);
  }
  function reset() { items = SAMPLE_FEES.map((item) => ({ ...item, payments: [...item.payments] })); DataStore.saveCollection("fees", items); }
  return { all, forStudent, addPayment, setDueDate, setFeeRecord, getSummary, removeForStudent, reset };
})();
