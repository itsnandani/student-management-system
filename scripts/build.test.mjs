import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { buildSite } from "./build.mjs";

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "scholar-build-"));
  await mkdir(path.join(root, "css"), { recursive: true });
  await mkdir(path.join(root, "js"), { recursive: true });
  await mkdir(path.join(root, "assets"), { recursive: true });
  await writeFile(path.join(root, "index.html"), '<html><head><link rel="stylesheet" href="css/style.css"></head><body><script src="js/app.js"></script><script src="js/version.js"></script></body></html>');
  await writeFile(path.join(root, "css", "style.css"), "body { color: purple; background-image: url('../assets/logo.svg'); }");
  await writeFile(path.join(root, "js", "app.js"), "window.appLoaded = true;");
  await writeFile(path.join(root, "js", "version.js"), "window.versionChecked = true;");
  await writeFile(path.join(root, "assets", "logo.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>");
  return root;
}

test("build hashes referenced assets and generates one matching application version", async () => {
  const root = await createFixture();
  try {
    const { version } = await buildSite(root);
    const html = await readFile(path.join(root, "dist", "index.html"), "utf8");
    const manifest = JSON.parse(await readFile(path.join(root, "dist", "version.json"), "utf8"));
    assert.match(html, /css\/style\.[a-f0-9]{12}\.css/);
    assert.match(html, /js\/app\.[a-f0-9]{12}\.js/);
    assert.match(html, new RegExp(`SCHOLAR_APP_VERSION = "${version}"`));
    assert.equal((html.match(/<script src="js\/app\.[a-f0-9]{12}\.js"><\/script>/g) ?? []).length, 1);
    assert.ok(html.indexOf('src="js/app.') < html.indexOf('src="js/version.'));
    assert.equal(manifest.version, version);
    const cssName = html.match(/href="(css\/style\.[a-f0-9]{12}\.css)"/)[1];
    const css = await readFile(path.join(root, "dist", cssName), "utf8");
    assert.match(css, /url\(['"]?\.\.\/assets\/logo\.[a-f0-9]{12}\.svg/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("HTML-only edits also change the automatic application version", async () => {
  const root = await createFixture();
  try {
    const first = await buildSite(root);
    await writeFile(path.join(root, "index.html"), '<html><head><title>Updated</title><link rel="stylesheet" href="css/style.css"></head><body><script src="js/app.js"></script></body></html>');
    const second = await buildSite(root);
    assert.notEqual(first.version, second.version);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("asset edits automatically change the content hash and application version", async () => {
  const root = await createFixture();
  try {
    const first = await buildSite(root);
    const firstHtml = await readFile(path.join(root, "dist", "index.html"), "utf8");
    const firstCss = firstHtml.match(/href="(css\/style\.[a-f0-9]{12}\.css)"/)?.[1];
    await writeFile(path.join(root, "css", "style.css"), "body { color: indigo; }");
    const second = await buildSite(root);
    const html = await readFile(path.join(root, "dist", "index.html"), "utf8");
    const secondCss = html.match(/href="(css\/style\.[a-f0-9]{12}\.css)"/)?.[1];
    assert.notEqual(first.version, second.version);
    assert.notEqual(firstCss, secondCss);
    assert.ok(secondCss);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("linked image edits also change the rewritten stylesheet hash", async () => {
  const root = await createFixture();
  try {
    await buildSite(root);
    const firstHtml = await readFile(path.join(root, "dist", "index.html"), "utf8");
    const firstCss = firstHtml.match(/href="(css\/style\.[a-f0-9]{12}\.css)"/)[1];
    await writeFile(path.join(root, "assets", "logo.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\"><title>Updated</title></svg>");
    await buildSite(root);
    const secondHtml = await readFile(path.join(root, "dist", "index.html"), "utf8");
    const secondCss = secondHtml.match(/href="(css\/style\.[a-f0-9]{12}\.css)"/)[1];
    assert.notEqual(firstCss, secondCss);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("update checking does not alter application data and requests the version without cache", async () => {
  const source = await readFile(new URL("../js/version.js", import.meta.url), "utf8");
  assert.match(source, /cache:\s*"no-store"/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|caches\.delete/);
});
