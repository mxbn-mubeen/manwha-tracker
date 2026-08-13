import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

declare const require: {
  resolve: { paths(id: string): string[] | null };
};

// Some of our dependencies (e.g. got-scraping) ship as pure ESM with no
// "require" or "default" condition in their package.json "exports" map —
// only "import". That means require.resolve('pkg') fails outright with
// ERR_PACKAGE_PATH_NOT_EXPORTED, because Node's CJS resolver can't find a
// condition it's allowed to use. It's not a resolution-*path* problem (like
// the entry-module referrer issue this file also works around) — the
// package simply refuses to be reached via `require`/CJS resolution at all,
// by design.
//
// Workaround: find the package directory ourselves using the plain
// node_modules search paths (require.resolve.paths — this does NOT go
// through exports-map enforcement, it's just the list of node_modules
// directories Node would search), read that package's own package.json to
// find its real ESM entry file, then import that file directly by an
// absolute file:// URL. Importing a package's internal file directly
// bypasses "exports" enforcement (Node only enforces the exports map when
// resolving by *package name*, not when given a literal file path/URL).
//
// The dynamic import itself is still wrapped in `new Function(...)` so
// TypeScript doesn't downlevel it to a `require()` call (which would throw
// ERR_REQUIRE_ESM). We import an absolute file:// URL rather than a bare
// specifier so it doesn't matter which module this ends up being attributed
// to at runtime.
export async function importEsmPackage<T = any>(packageName: string): Promise<T> {
  const searchPaths = require.resolve.paths(packageName) ?? [];

  for (const dir of searchPaths) {
    const pkgDir = join(dir, packageName);
    const pkgJsonPath = join(pkgDir, "package.json");
    if (!existsSync(pkgJsonPath)) continue;

    const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
    const exportsField = pkg.exports;

    let entryRelative: string | undefined;
    if (typeof exportsField === "string") {
      entryRelative = exportsField;
    } else if (exportsField && typeof exportsField === "object") {
      const rootExport = exportsField["."] ?? exportsField;
      entryRelative =
        typeof rootExport === "string"
          ? rootExport
          : rootExport?.import?.default ?? rootExport?.import ?? rootExport?.default;
    }
    entryRelative ??= pkg.module ?? pkg.main ?? "index.js";

    const entryAbsolute = join(pkgDir, entryRelative ?? "index.js");
    if (!existsSync(entryAbsolute)) continue;

    const fileUrl = pathToFileURL(entryAbsolute).href;
    const dynamicImport = new Function("modulePath", "return import(modulePath)");
    return dynamicImport(fileUrl) as Promise<T>;
  }

  throw new Error(
    `Could not locate ESM package "${packageName}" on disk under any of: ${searchPaths.join(", ")}`
  );
}