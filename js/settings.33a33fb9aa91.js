const Settings = (() => {
  let value = DataStore.loadCollection("settings", { schoolName: "Scholar Academy", adminName: "Admin", email: "admin@scholar.edu", phone: "+91 9876543210", theme: "light" });
  function get() { return { ...value }; }
  function save(next) {
    value = { ...value, ...next };
    if (!["light", "dark"].includes(value.theme)) throw new Error("Theme selection is invalid.");
    DataStore.saveCollection("settings", value);
    document.documentElement.dataset.theme = value.theme;
  }
  function applyTheme() { document.documentElement.dataset.theme = value.theme || "light"; }
  function exportBackup(students) {
    const blob = new Blob([JSON.stringify(DataStore.exportSnapshot(students), null, 2)], { type: "application/json" });
    Settings.download(blob, "scholar-portal-backup.json");
  }
  function importBackup(file) {
    return file.text().then((text) => {
      let snapshot;
      try { snapshot = JSON.parse(text); } catch { throw new Error("The selected backup is not valid JSON."); }
      DataStore.importSnapshot(snapshot);
    });
  }
  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return { get, save, applyTheme, exportBackup, importBackup, download };
})();
