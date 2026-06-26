"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const cliPath = path.join(repoRoot, "bin", "qdash-agent-skills.js");

function spawnCli(args, options = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      ...options.env,
    },
  });
}

function runCli(args, options = {}) {
  const result = spawnCli(args, options);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "qdash-agent-skills-test-"));
}

test("path prints source and CODEX_HOME-derived install paths", () => {
  const codexHome = makeTempDir();

  const output = runCli(["path"], { env: { CODEX_HOME: codexHome } });

  assert.match(output, /source: .*skills\/qdash/);
  assert.match(output, new RegExp(`default_install: ${codexHome}/skills/qdash`));
  assert.match(output, new RegExp(`codex_home: ${codexHome}`));
});

test("install copies the bundled qdash skill into a target directory", () => {
  const target = path.join(makeTempDir(), "qdash");

  const output = runCli(["install", "--target", target]);

  assert.match(output, /status: installed/);
  assert.equal(fs.existsSync(path.join(target, "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(target, "scripts", "qdash_query.py")), true);
  assert.equal(fs.existsSync(path.join(target, "references", "qdash.md")), true);
});

test("install refuses to overwrite without force", () => {
  const target = path.join(makeTempDir(), "qdash");
  fs.mkdirSync(target, { recursive: true });

  const result = spawnCli(["install", "--target", target]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Target already exists/);
});

test("update replaces an existing target", () => {
  const target = path.join(makeTempDir(), "qdash");
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, "old.txt"), "stale");

  const output = runCli(["update", "--target", target]);

  assert.match(output, /action: replace existing skill/);
  assert.match(output, /status: installed/);
  assert.equal(fs.existsSync(path.join(target, "old.txt")), false);
  assert.equal(fs.existsSync(path.join(target, "SKILL.md")), true);
});

test("doctor reports profile names without reading secret values", () => {
  const root = makeTempDir();
  const configDir = path.join(root, "xdg", "qdash");
  const codexHome = path.join(root, "codex");
  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(path.join(codexHome, "skills", "qdash"), { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, "skills", "qdash", "SKILL.md"),
    path.join(codexHome, "skills", "qdash", "SKILL.md"),
  );
  fs.writeFileSync(
    path.join(configDir, "config.ini"),
    "[local]\napi_token = secret-token\n\n[prod]\ncf_access_client_secret = secret\n",
  );

  const output = runCli(["doctor"], {
    env: {
      CODEX_HOME: codexHome,
      XDG_CONFIG_HOME: path.join(root, "xdg"),
    },
  });

  assert.match(output, /ok: config_exists/);
  assert.match(output, /profiles: local, prod/);
  assert.doesNotMatch(output, /secret-token/);
  assert.doesNotMatch(output, /cf_access_client_secret/);
});
