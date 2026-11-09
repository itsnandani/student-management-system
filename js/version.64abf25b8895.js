(() => {
  const currentVersion = window.SCHOLAR_APP_VERSION;
  if (!currentVersion || window.location.protocol === "file:") return;

  let notice;
  let checkInProgress = false;

  function showUpdateNotice() {
    if (notice) return;
    notice = document.createElement("aside");
    notice.className = "update-notice";
    notice.setAttribute("role", "status");
    notice.innerHTML = '<span>A newer version of Scholar is available.</span><button type="button">Refresh safely</button>';
    notice.querySelector("button").addEventListener("click", () => {
      const url = new URL(window.location.href);
      url.searchParams.set("refresh", currentVersion);
      window.location.replace(url.href);
    });
    document.body.appendChild(notice);
  }

  async function checkForUpdate() {
    if (checkInProgress || document.visibilityState === "hidden") return;
    checkInProgress = true;
    try {
      const manifestUrl = new URL("version.json", document.baseURI);
      const response = await fetch(manifestUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`Version check failed (${response.status}).`);
      const manifest = await response.json();
      if (typeof manifest.version !== "string" || !/^[a-f0-9]{16}$/.test(manifest.version)) {
        throw new Error("The deployment version manifest is invalid.");
      }
      if (manifest.version !== currentVersion) showUpdateNotice();
    } catch (error) {
      console.warn("Could not check for a Scholar update.", error);
    } finally {
      checkInProgress = false;
    }
  }

  checkForUpdate();
  window.addEventListener("focus", checkForUpdate);
  document.addEventListener("visibilitychange", checkForUpdate);
  window.setInterval(checkForUpdate, 5 * 60 * 1000);
})();
