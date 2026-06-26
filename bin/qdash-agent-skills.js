#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const skillName = "qdash";
const sourceSkillDir = path.join(repoRoot, "skills", skillName);

function usage() {
  console.log(`Usage: qdash-agent-skills <command> [options]

Commands:
  install       Install the qdash skill into Codex's user skill directory
  update        Replace the installed qdash skill with this package's copy
  doctor        Check local skill, qdash config, and runtime prerequisites
  path          Print source and default install paths
  help          Show this help

Install/update options:
  --target DIR  Install into DIR instead of the default Codex skill path
  --force       Replace an existing installed qdash skill
  --dry-run     Show what would happen without copying files

Doctor options:
  --config FILE Check a specific qdash config.ini path
`);
}

function parseArgs(argv) {
  const options = {
    command: argv[2] || "help",
    target: null,
    config: null,
    force: false,
    dryRun: false,
  };

  for (let index = 3; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--force") {
      options.force = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--target") {
      index += 1;
      options.target = argv[index];
    } else if (arg.startsWith("--target=")) {
      options.target = arg.slice("--target=".length);
    } else if (arg === "--config") {
      index += 1;
      options.config = argv[index];
    } else if (arg.startsWith("--config=")) {
      options.config = arg.slice("--config=".length);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return options;
}

function defaultCodexHome() {
  return process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
}

function defaultInstallDir() {
  return path.join(defaultCodexHome(), "skills", skillName);
}

function defaultConfigPath() {
  if (process.env.XDG_CONFIG_HOME) {
    return path.join(process.env.XDG_CONFIG_HOME, "qdash", "config.ini");
  }
  return path.join(os.homedir(), ".config", "qdash", "config.ini");
}

function ensureSkillSource() {
  const skillFile = path.join(sourceSkillDir, "SKILL.md");
  if (!fs.existsSync(skillFile)) {
    throw new Error(`Missing bundled skill source: ${skillFile}`);
  }
}

function copyRecursive(source, destination) {
  const stats = fs.statSync(source);
  if (stats.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(destination, entry));
    }
    return;
  }
  fs.copyFileSync(source, destination);
}

function commandInstall(options) {
  ensureSkillSource();
  const target = path.resolve(options.target || defaultInstallDir());
  console.log(`source: ${sourceSkillDir}`);
  console.log(`target: ${target}`);

  if (fs.existsSync(target)) {
    if (!options.force) {
      if (options.dryRun) {
        console.log("action: target exists; install would require --force");
        console.log("status: dry-run complete");
        return;
      }
      throw new Error(`Target already exists. Re-run with --force to replace it: ${target}`);
    }
    console.log("action: replace existing skill");
    if (!options.dryRun) {
      fs.rmSync(target, { recursive: true, force: true });
    }
  } else {
    console.log("action: install new skill");
  }

  if (!options.dryRun) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    copyRecursive(sourceSkillDir, target);
  }
  console.log(options.dryRun ? "status: dry-run complete" : "status: installed");
}

function run(command, args) {
  return spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function commandExists(command) {
  const result = run(command, ["--version"]);
  return result.status === 0 || result.status === 1;
}

function readProfiles(configPath) {
  if (!fs.existsSync(configPath)) {
    return [];
  }
  const profiles = [];
  const content = fs.readFileSync(configPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const match = line.trim().match(/^\[([^\]]+)\]$/);
    if (match) {
      profiles.push(match[1]);
    }
  }
  return profiles;
}

function checkPythonImport(command) {
  const result = run(command, ["-c", "import qdash.client"]);
  return result.status === 0;
}

function commandDoctor(options) {
  ensureSkillSource();
  const configPath = path.resolve(options.config || defaultConfigPath());
  const installDir = defaultInstallDir();
  const profiles = readProfiles(configPath);
  const python = commandExists("python3") ? "python3" : commandExists("python") ? "python" : null;

  const checks = [
    ["skill_source", fs.existsSync(path.join(sourceSkillDir, "SKILL.md"))],
    ["skill_script", fs.existsSync(path.join(sourceSkillDir, "scripts", "qdash_query.py"))],
    ["default_install_exists", fs.existsSync(path.join(installDir, "SKILL.md"))],
    ["uv_available", commandExists("uv")],
    ["python_available", python !== null],
    ["qdash_client_importable", python ? checkPythonImport(python) : false],
    ["config_exists", fs.existsSync(configPath)],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "ok" : "warn"}: ${name}`);
  }
  console.log(`source: ${sourceSkillDir}`);
  console.log(`default_install: ${installDir}`);
  console.log(`config: ${configPath}`);
  console.log(`profiles: ${profiles.length ? profiles.join(", ") : "(none)"}`);
  if (python && !checkPythonImport(python)) {
    console.log(
      "hint: qdash-client is not importable in the default Python. Use uv run --with qdash-client for helper commands.",
    );
  }
}

function commandPath() {
  ensureSkillSource();
  console.log(`source: ${sourceSkillDir}`);
  console.log(`default_install: ${defaultInstallDir()}`);
  console.log(`codex_home: ${defaultCodexHome()}`);
}

function main() {
  const options = parseArgs(process.argv);
  if (options.command === "help" || options.command === "--help" || options.command === "-h") {
    usage();
  } else if (options.command === "install") {
    commandInstall(options);
  } else if (options.command === "update") {
    commandInstall({ ...options, force: true });
  } else if (options.command === "doctor") {
    commandDoctor(options);
  } else if (options.command === "path") {
    commandPath();
  } else {
    throw new Error(`Unknown command: ${options.command}`);
  }
}

try {
  main();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exitCode = 1;
}
