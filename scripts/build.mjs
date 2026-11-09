import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), "..");
const excludedDirectories = new Set([".git", ".github", "dist", "node_modules"]);

function digest(content) {
  return createHash("sha256").update(content).digest("hex");
}

function hashedName(filePath, content) {
  const extension = path.extname(filePath);
  const name = path.basename(filePath, extension);
  return `${name}.${digest(content).slice(0, 12)}${extension}`;
}

function isExternalReference(reference) {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference);
}

export async function buildSite(root = projectRoot, output = path.join(root, "dist")) {
  root = path.resolve(root);
  output = path.resolve(output);
  if (output !== path.join(root, "dist")) {
    throw new Error("Build output must be the project's generated dist directory.");
  }

  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  async function copyProject(sourceDirectory, destinationDirectory) {
    await mkdir(destinationDirectory, { recursive: true });
    for (const entry of await readdir(sourceDirectory, { withFileTypes: true })) {
      if (excludedDirectories.has(entry.name)) continue;
      const sourcePath = path.join(sourceDirectory, entry.name);
      const destinationPath = path.join(destinationDirectory, entry.name);
      if (entry.isDirectory()) await copyProject(sourcePath, destinationPath);
      else if (entry.isFile()) await copyFile(sourcePath, destinationPath);
    }
  }
  await copyProject(root, output);

  const generated = new Map();
  const sourceHashes = new Map();

  async function versionedReference(reference, fromFile) {
    if (isExternalReference(reference)) return reference;
    const cleanReference = reference.split(/[?#]/, 1)[0];
    if (!cleanReference) return reference;
    const decodedReference = decodeURIComponent(cleanReference);
    const sourcePath = path.resolve(path.dirname(fromFile), decodedReference);
    const relativeSource = path.relative(root, sourcePath);
    if (relativeSource.startsWith(`..${path.sep}`) || relativeSource === ".." || path.isAbsolute(relativeSource)) {
      throw new Error(`Asset reference escapes the project directory: ${reference}`);
    }

    let content = generated.get(sourcePath);
    if (!content) {
      content = await readFile(sourcePath);
      generated.set(sourcePath, content);
    }

    let outputContent = content;
    if (path.extname(sourcePath).toLowerCase() === ".css") {
      const css = content.toString("utf8");
      outputContent = Buffer.from(await replaceReferences(css, sourcePath, /url\(\s*(["']?)(.*?)\1\s*\)/gi));
    }

    const outputPath = path.join(output, path.dirname(relativeSource), hashedName(sourcePath, outputContent));
    sourceHashes.set(relativeSource, digest(outputContent));
    if (!generated.has(outputPath)) {
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, outputContent);
      generated.set(outputPath, outputContent);
    }

    const fromDirectory = path.relative(root, path.dirname(fromFile));
    const versionedSourcePath = path.join(path.dirname(relativeSource), hashedName(sourcePath, outputContent));
    const relativeOutput = path.relative(fromDirectory, versionedSourcePath).split(path.sep).join("/");
    const suffix = reference.slice(cleanReference.length);
    return `${relativeOutput}${suffix}`;
  }

  async function replaceReferences(source, fromFile, pattern, referenceGroup = 2) {
    const matches = [...source.matchAll(pattern)];
    let result = source;
    for (const match of matches.reverse()) {
      const reference = match[referenceGroup];
      if (isExternalReference(reference)) continue;
      const updated = await versionedReference(reference, fromFile);
      result = `${result.slice(0, match.index)}${match[0].replace(reference, updated)}${result.slice(match.index + match[0].length)}`;
    }
    return result;
  }

  const indexPath = path.join(root, "index.html");
  const sourceHtml = await readFile(indexPath, "utf8");
  let html = sourceHtml;
  html = await replaceReferences(html, indexPath, /\b(src|href)\s*=\s*(["'])(.*?)\2/gi, 3);
  sourceHashes.set("index.html", digest(sourceHtml));
  const version = digest([...sourceHashes.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([file, hash]) => `${file}:${hash}`).join("\n")).slice(0, 16);
  html = html.replace("</head>", `  <script>window.SCHOLAR_APP_VERSION = "${version}";</script>\n</head>`);
  await writeFile(path.join(output, "index.html"), html);
  await writeFile(path.join(output, "version.json"), `${JSON.stringify({ version }, null, 2)}\n`);
  return { version, assets: sourceHashes.size, output };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = await buildSite();
    console.log(`Built ${result.assets} versioned assets (version ${result.version}) in ${result.output}`);
  } catch (error) {
    console.error("Portal build failed:", error);
    process.exitCode = 1;
  }
}
