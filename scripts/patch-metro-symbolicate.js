/**
 * Metro symbolication calls readFileSync on stack "file" paths. Web/async frames
 * often use the literal "<anonymous>", which path.resolve turns into
 * projectRoot/<anonymous> and spams ENOENT. Skip those frames before reading.
 */
const fs = require("fs");
const path = require("path");

const MARKER = "/* metro-anonymous-frame-skip */";

function patchContent(s) {
  if (s.includes(MARKER)) {
    return null;
  }

  const needlePathResolve = `        ) {
          continue;
        }
        const fileAbsolute = path.resolve(this._config.projectRoot, file ?? "");`;

  const guardPathResolve = `        ) {
          continue;
        }
        ${MARKER}
        if (
          typeof file === "string" &&
          (file === "<anonymous>" || file.includes("<anonymous>"))
        ) {
          continue;
        }
        const fileAbsolute = path.resolve(this._config.projectRoot, file ?? "");`;

  if (s.includes(needlePathResolve)) {
    return s.replace(needlePathResolve, guardPathResolve);
  }

  const needlePathDefault = `        ) {
          continue;
        }
        const fileAbsolute = _path.default.resolve(
          this._config.projectRoot,
          file ?? "",
        );`;

  const guardPathDefault = `        ) {
          continue;
        }
        ${MARKER}
        if (
          typeof file === "string" &&
          (file === "<anonymous>" || file.includes("<anonymous>"))
        ) {
          continue;
        }
        const fileAbsolute = _path.default.resolve(
          this._config.projectRoot,
          file ?? "",
        );`;

  if (s.includes(needlePathDefault)) {
    return s.replace(needlePathDefault, guardPathDefault);
  }

  return null;
}

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  const original = fs.readFileSync(filePath, "utf8");
  const next = patchContent(original);
  if (next == null) {
    return false;
  }
  fs.writeFileSync(filePath, next);
  console.log("[patch-metro-symbolicate] Updated", filePath);
  return true;
}

const root = path.join(__dirname, "..");
const candidates = [
  path.join(root, "node_modules", "@expo", "metro", "node_modules", "metro", "src", "Server.js"),
  path.join(root, "node_modules", "metro", "src", "Server.js"),
];

let patched = false;
for (const p of candidates) {
  if (patchFile(p)) {
    patched = true;
  }
}

if (!patched) {
  console.log(
    "[patch-metro-symbolicate] No Metro Server.js matched (already patched or different Metro layout).",
  );
}
