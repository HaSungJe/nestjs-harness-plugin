#!/usr/bin/env node
import { program } from 'commander';
import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SKELETON_DIR = path.resolve(__dirname, '..', 'skeleton');
const PLUGIN_PKG = await fs.readJson(path.resolve(__dirname, '..', 'package.json'));
const PKG_NAME = 'nestjs-harness-plugin';
const PKG_VERSION = PLUGIN_PKG.version;
const PKG_INSTALL_SPEC = 'github:HaSungJe/nestjs-harness-plugin';
const HARNESS_BLOCK_START = '# === harness-block-start ===';
const HARNESS_BLOCK_END = '# === harness-block-end ===';

const c = {
    green: (s) => `\x1b[32m${s}\x1b[0m`,
    yellow: (s) => `\x1b[33m${s}\x1b[0m`,
    red: (s) => `\x1b[31m${s}\x1b[0m`,
    cyan: (s) => `\x1b[36m${s}\x1b[0m`,
    gray: (s) => `\x1b[90m${s}\x1b[0m`,
    bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const log = {
    info: (m) => console.log(c.cyan('[nestjs-harness-plugin]'), m),
    ok: (m) => console.log(c.green('  ✓'), m),
    skip: (m) => console.log(c.gray('  -'), c.gray(`${m} (exists, skipped)`)),
    warn: (m) => console.log(c.yellow('  !'), m),
    error: (m) => console.log(c.red('  ✗'), m),
};

program
    .name(PKG_NAME)
    .description('Drop-in harness for NestJS — structures AI-assisted feature development')
    .version(PKG_VERSION);

program
    .command('init')
    .description('Inject harness into current project')
    .option('-f, --force', 'overwrite existing files')
    .option('-d, --dry-run', 'preview changes without writing')
    .option('--skip-install', 'skip npm install step')
    .action(runInit);

program
    .command('update')
    .description('Refresh harness logic files (preserves output/, memory/, harness-config.json user values)')
    .option('-d, --dry-run', 'preview changes without writing')
    .action(runUpdate);

program
    .command('uninstall')
    .description('Remove harness from current project (preserves user artifacts by default)')
    .option('--purge', 'also delete user artifacts (output/, memory/, harness-config.json)')
    .option('-d, --dry-run', 'preview changes without writing')
    .action(runUninstall);

program.parse();

async function runInit(opts) {
    const cwd = process.cwd();
    const { force = false, dryRun = false, skipInstall = false } = opts;

    log.info(c.bold(`Starting init in ${cwd}`));
    if (dryRun) log.warn('dry-run mode — no files will be modified');

    // 1. Verify project
    const userPkgPath = path.join(cwd, 'package.json');
    if (!(await fs.pathExists(userPkgPath))) {
        log.error('No package.json found. Run inside a NestJS project.');
        process.exit(1);
    }
    const userPkg = await fs.readJson(userPkgPath);
    const projectName = userPkg.name || 'my-project';
    log.info(`Project: ${c.bold(projectName)}`);

    const stats = {added: 0, skipped: 0, merged: 0};

    // 2. Copy .harness/
    log.info('\n[1/6] Copying .harness/ scaffold...');
    await copyHarness(cwd, projectName, {force, dryRun, stats});

    // 3. Merge .claude/settings.json
    log.info('\n[2/6] Merging .claude/settings.json...');
    await mergeClaudeSettings(cwd, {dryRun, stats});

    // 4. Copy .claude/commands/
    log.info('\n[3/6] Copying .claude/commands/...');
    await copyClaudeCommands(cwd, {force, dryRun, stats});

    // 5. Ensure husky + merge .husky/pre-commit
    log.info('\n[4/6] Configuring .husky/pre-commit...');
    await mergeHuskyPreCommit(cwd, {dryRun, skipInstall, stats});

    // 6. Append .gitignore
    log.info('\n[5/6] Updating .gitignore...');
    await appendGitignore(cwd, {dryRun, stats});

    // 7. Install self as devDependency
    if (!dryRun && !skipInstall) {
        log.info('\n[6/6] Installing nestjs-harness-plugin as devDependency...');
        try {
            await execa('npm', ['install', '-D', PKG_INSTALL_SPEC], {cwd, stdio: 'inherit'});
            log.ok(`${PKG_NAME} added to devDependencies`);
        } catch (err) {
            log.warn(`npm install failed: ${err.message}`);
            log.warn(`Run 'npm install -D ${PKG_INSTALL_SPEC}' manually.`);
        }
    }

    // Summary
    console.log();
    log.info(c.bold('Done'));
    console.log(`  added:   ${c.green(stats.added)}`);
    console.log(`  skipped: ${c.gray(stats.skipped)}`);
    console.log(`  merged:  ${c.cyan(stats.merged)}`);
    console.log();
    log.info(c.bold('Next steps'));
    console.log('  1. Restart Claude Code to pick up .claude/settings.json hooks');
    console.log('  2. Run ' + c.cyan('/harness-init') + ' in Claude Code — auto-generates root CLAUDE.md + docs/ from your stack');
    console.log('     (or strip `.sample.` from ' + c.cyan('.harness/samples/starter/CLAUDE.sample.md') + ' and copy/customize manually)');
    console.log('  3. Try ' + c.cyan('/feature-plan <featureName>') + ' or ' + c.cyan('"<featureName> 기능 생성"') + ' in Claude Code');
}

// ─── update command ─────────────────────────────────────────────────────────
async function runUpdate(opts) {
    const cwd = process.cwd();
    const { dryRun = false } = opts;

    log.info(c.bold(`Updating harness in ${cwd}`));
    if (dryRun) log.warn('dry-run mode — no files will be modified');

    const harnessDir = path.join(cwd, '.harness');
    if (!(await fs.pathExists(harnessDir))) {
        log.error('No .harness/ found. Run `init` first.');
        process.exit(1);
    }

    const userPkgPath = path.join(cwd, 'package.json');
    if (!(await fs.pathExists(userPkgPath))) {
        log.error('No package.json found. Run inside a project root.');
        process.exit(1);
    }
    const userPkg = await fs.readJson(userPkgPath);
    const projectName = userPkg.name || 'my-project';

    const stats = {added: 0, skipped: 0, merged: 0, removed: 0};

    // 1. Wipe refreshable (plugin-owned) dirs
    log.info('\n[1/5] Clearing plugin-owned directories...');
    const refreshables = ['docs', 'hooks', 'templates', 'validators', 'samples'];
    for (const dir of refreshables) {
        const p = path.join(harnessDir, dir);
        if (!(await fs.pathExists(p))) continue;
        if (!dryRun) await fs.remove(p);
        log.ok(`cleared .harness/${dir}/`);
        stats.removed++;
    }
    // Also wipe plugin-owned .claude/commands/ files
    await wipePluginOwnedCommands(cwd, {dryRun, stats});

    // 2. Re-copy skeleton (existing files that weren't wiped are skipped)
    log.info('\n[2/5] Re-copying skeleton...');
    await copyHarness(cwd, projectName, {force: false, dryRun, stats});

    // 3. Deep-merge harness-config.json (preserve user values, add new keys)
    log.info('\n[3/5] Merging harness-config.json (preserve user values, add new keys)...');
    await mergeHarnessConfig(cwd, projectName, {dryRun, stats});

    // 4. Re-copy .claude/commands/
    log.info('\n[4/5] Re-copying .claude/commands/...');
    await copyClaudeCommands(cwd, {force: false, dryRun, stats});

    // 5. Re-run idempotent merges for settings / husky / gitignore
    log.info('\n[5/5] Re-applying settings / husky / gitignore merges...');
    await mergeClaudeSettings(cwd, {dryRun, stats});
    await mergeHuskyPreCommit(cwd, {dryRun, skipInstall: true, stats});
    await appendGitignore(cwd, {dryRun, stats});

    // Summary
    console.log();
    log.info(c.bold('Updated'));
    console.log(`  added:    ${c.green(stats.added)}`);
    console.log(`  removed:  ${c.gray(stats.removed)}`);
    console.log(`  merged:   ${c.cyan(stats.merged)}`);
    console.log(`  skipped:  ${c.gray(stats.skipped)}`);
    console.log();
    log.info('Preserved: ' + c.cyan('.harness/output/') + ', ' + c.cyan('.harness/memory/') + ', ' + c.cyan('harness-config.json') + ' (user values)');
}

async function mergeHarnessConfig(cwd, projectName, {dryRun, stats}) {
    const skelPath = path.join(SKELETON_DIR, '.harness', 'harness-config.json');
    const skelContent = (await fs.readFile(skelPath, 'utf-8'))
        .replace(/\{\{PROJECT_NAME\}\}/g, projectName);
    const skelConfig = JSON.parse(skelContent);

    const destPath = path.join(cwd, '.harness', 'harness-config.json');

    if (!(await fs.pathExists(destPath))) {
        if (!dryRun) {
            await fs.ensureDir(path.dirname(destPath));
            await fs.writeFile(destPath, skelContent);
        }
        log.ok('.harness/harness-config.json (created)');
        stats.added++;
        return;
    }

    const userConfig = await fs.readJson(destPath);
    const merged = deepMergePreservingUser(skelConfig, userConfig);

    if (JSON.stringify(merged) === JSON.stringify(userConfig)) {
        log.skip('.harness/harness-config.json (already up-to-date)');
        stats.skipped++;
        return;
    }

    if (!dryRun) await fs.writeJson(destPath, merged, {spaces: 2});
    log.ok('.harness/harness-config.json (new keys merged, user values preserved)');
    stats.merged++;
}

// Deep-merge where user values always win.
// New keys from skel fill in only where user has none.
function deepMergePreservingUser(skel, user) {
    if (skel === null || typeof skel !== 'object' || Array.isArray(skel)) {
        return user !== undefined ? user : skel;
    }
    if (user === null || typeof user !== 'object' || Array.isArray(user)) {
        return user !== undefined ? user : skel;
    }
    const result = {};
    const keys = new Set([...Object.keys(skel), ...Object.keys(user)]);
    for (const k of keys) {
        if (k in user && k in skel) {
            result[k] = deepMergePreservingUser(skel[k], user[k]);
        } else if (k in user) {
            result[k] = user[k];
        } else {
            result[k] = skel[k];
        }
    }
    return result;
}

// ─── uninstall command ─────────────────────────────────────────────────────
async function runUninstall(opts) {
    const cwd = process.cwd();
    const { purge = false, dryRun = false } = opts;

    log.info(c.bold(`Uninstalling harness from ${cwd}`));
    if (dryRun) log.warn('dry-run mode — no files will be modified');
    if (purge) log.warn(c.yellow('--purge: user artifacts (output/, memory/, harness-config.json) will also be deleted'));

    const harnessDir = path.join(cwd, '.harness');
    if (!(await fs.pathExists(harnessDir))) {
        log.error('No .harness/ found. Nothing to uninstall.');
        process.exit(1);
    }

    const stats = {removed: 0, kept: 0};

    // 1. .harness/
    log.info('\n[1/6] Cleaning .harness/...');
    if (purge) {
        if (!dryRun) await fs.remove(harnessDir);
        log.ok('.harness/ (fully removed)');
        stats.removed++;
    } else {
        const pluginOwned = ['docs', 'hooks', 'templates', 'validators', 'samples', 'README.md'];
        for (const item of pluginOwned) {
            const p = path.join(harnessDir, item);
            if (!(await fs.pathExists(p))) continue;
            if (!dryRun) await fs.remove(p);
            log.ok(`.harness/${item}`);
            stats.removed++;
        }
        for (const item of ['output', 'memory', 'harness-config.json']) {
            if (await fs.pathExists(path.join(harnessDir, item))) {
                log.skip(`.harness/${item} (preserved)`);
                stats.kept++;
            }
        }
    }

    // 2. .claude/settings.json
    log.info('\n[2/6] Cleaning .claude/settings.json...');
    await removeClaudeSettings(cwd, {dryRun, stats});

    // 2.5. .claude/commands/ (plugin-owned only)
    log.info('\n[3/6] Cleaning .claude/commands/...');
    await wipePluginOwnedCommands(cwd, {dryRun, stats});

    // 4. .husky/pre-commit
    log.info('\n[4/6] Cleaning .husky/pre-commit...');
    await removeHuskyBlock(cwd, {dryRun, stats});

    // 5. .gitignore
    log.info('\n[5/6] Cleaning .gitignore...');
    await removeGitignoreEntries(cwd, {dryRun, stats});

    // 6. devDependency
    log.info('\n[6/6] Removing devDependency...');
    if (!dryRun) {
        try {
            await execa('npm', ['uninstall', PKG_NAME], {cwd, stdio: 'inherit'});
            log.ok(`${PKG_NAME} removed from devDependencies`);
        } catch (err) {
            log.warn(`npm uninstall failed: ${err.message}`);
            log.warn(`Run 'npm uninstall ${PKG_NAME}' manually if needed.`);
        }
    }

    // Summary
    console.log();
    log.info(c.bold('Uninstalled'));
    console.log(`  removed: ${c.red(stats.removed)}`);
    console.log(`  kept:    ${c.gray(stats.kept)}`);
    if (!purge && stats.kept > 0) {
        console.log();
        log.info('User artifacts preserved in ' + c.cyan('.harness/') + ' — use ' + c.cyan('--purge') + ' to also delete them');
    }
}

async function removeClaudeSettings(cwd, {dryRun, stats}) {
    const partialPath = path.join(SKELETON_DIR, 'claude-settings.partial.json');
    const partial = await fs.readJson(partialPath);
    delete partial._comment;

    const destPath = path.join(cwd, '.claude', 'settings.json');
    if (!(await fs.pathExists(destPath))) {
        log.skip('.claude/settings.json (not present)');
        return;
    }

    let target;
    try {
        target = await fs.readJson(destPath);
    } catch {
        log.warn('.claude/settings.json is not valid JSON, skipping');
        return;
    }

    let changed = false;

    // Remove matching hooks
    for (const srcEntry of partial.hooks?.PostToolUse ?? []) {
        const matcherEntry = target.hooks?.PostToolUse?.find((e) => e.matcher === srcEntry.matcher);
        if (!matcherEntry) continue;
        for (const srcHook of srcEntry.hooks ?? []) {
            const idx = matcherEntry.hooks?.findIndex((h) => h.type === srcHook.type && h.command === srcHook.command) ?? -1;
            if (idx >= 0) {
                matcherEntry.hooks.splice(idx, 1);
                changed = true;
            }
        }
        if (matcherEntry.hooks?.length === 0) {
            const idx = target.hooks.PostToolUse.indexOf(matcherEntry);
            if (idx >= 0) target.hooks.PostToolUse.splice(idx, 1);
        }
    }
    if (target.hooks?.PostToolUse?.length === 0) delete target.hooks.PostToolUse;
    if (target.hooks && Object.keys(target.hooks).length === 0) delete target.hooks;

    // Remove matching permissions
    for (const rule of partial.permissions?.allow ?? []) {
        const idx = target.permissions?.allow?.indexOf(rule) ?? -1;
        if (idx >= 0) {
            target.permissions.allow.splice(idx, 1);
            changed = true;
        }
    }
    if (target.permissions?.allow?.length === 0) delete target.permissions.allow;
    if (target.permissions && Object.keys(target.permissions).length === 0) delete target.permissions;

    if (!changed) {
        log.skip('.claude/settings.json (no harness entries found)');
        return;
    }

    if (!dryRun) await fs.writeJson(destPath, target, {spaces: 2});
    log.ok('.claude/settings.json (harness entries removed)');
    stats.removed++;
}

async function removeHuskyBlock(cwd, {dryRun, stats}) {
    const destPath = path.join(cwd, '.husky', 'pre-commit');
    if (!(await fs.pathExists(destPath))) {
        log.skip('.husky/pre-commit (not present)');
        return;
    }
    const content = await fs.readFile(destPath, 'utf-8');
    if (!content.includes(HARNESS_BLOCK_START)) {
        log.skip('.husky/pre-commit (no harness block)');
        return;
    }
    const cleaned = content
        .replace(new RegExp(`\\n?${HARNESS_BLOCK_START}[\\s\\S]*?${HARNESS_BLOCK_END}\\n?`, 'g'), '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    // If only shebang or fully empty → remove file
    const onlyShebangOrEmpty = cleaned === '' ||
        (/^#!/.test(cleaned) && cleaned.split('\n').slice(1).every((l) => l.trim() === ''));

    if (onlyShebangOrEmpty) {
        if (!dryRun) await fs.remove(destPath);
        log.ok('.husky/pre-commit (removed — only harness block was present)');
    } else {
        if (!dryRun) await fs.writeFile(destPath, cleaned + '\n');
        log.ok('.husky/pre-commit (harness block removed)');
    }
    stats.removed++;
}

async function removeGitignoreEntries(cwd, {dryRun, stats}) {
    const skelPath = path.join(SKELETON_DIR, 'gitignore-entries.txt');
    const entries = new Set(
        (await fs.readFile(skelPath, 'utf-8'))
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l && !l.startsWith('#'))
    );

    const destPath = path.join(cwd, '.gitignore');
    if (!(await fs.pathExists(destPath))) {
        log.skip('.gitignore (not present)');
        return;
    }
    const content = await fs.readFile(destPath, 'utf-8');
    const kept = [];
    let removedAny = false;
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed === '# nestjs-harness-plugin' || entries.has(trimmed)) {
            removedAny = true;
            continue;
        }
        kept.push(line);
    }
    // Collapse multiple trailing blank lines
    while (kept.length > 0 && kept[kept.length - 1].trim() === '') kept.pop();
    const cleaned = kept.join('\n') + (kept.length > 0 ? '\n' : '');

    if (!removedAny) {
        log.skip('.gitignore (no harness entries found)');
        return;
    }
    if (!dryRun) await fs.writeFile(destPath, cleaned);
    log.ok('.gitignore (harness entries removed)');
    stats.removed++;
}

// ─── Step 2: Copy .harness/ ─────────────────────────────────────────────────
async function copyHarness(cwd, projectName, {force, dryRun, stats}) {
    const skelDir = path.join(SKELETON_DIR, '.harness');
    const destDir = path.join(cwd, '.harness');
    const files = await walk(skelDir);

    for (const absFile of files) {
        const rel = path.relative(skelDir, absFile).split(path.sep).join('/');
        const dest = path.join(destDir, rel);
        const exists = await fs.pathExists(dest);

        if (exists && !force) {
            log.skip(`.harness/${rel}`);
            stats.skipped++;
            continue;
        }

        if (!dryRun) {
            await fs.ensureDir(path.dirname(dest));
            if (rel === 'harness-config.json') {
                const content = await fs.readFile(absFile, 'utf-8');
                await fs.writeFile(dest, content.replace(/\{\{PROJECT_NAME\}\}/g, projectName));
            } else {
                await fs.copy(absFile, dest);
            }
        }
        log.ok(`.harness/${rel}`);
        stats.added++;
    }

    // Ensure runtime dirs exist
    if (!dryRun) {
        await fs.ensureDir(path.join(destDir, 'output', 'request'));
        await fs.ensureDir(path.join(destDir, 'output', 'work'));
        await fs.ensureDir(path.join(destDir, 'output', 'report'));
    }
}

// ─── Copy .claude/commands/ ─────────────────────────────────────────────────
// Copies plugin-owned slash command files. Existing user-owned commands not touched.
async function copyClaudeCommands(cwd, {force, dryRun, stats}) {
    const srcDir = path.join(SKELETON_DIR, '.claude', 'commands');
    if (!(await fs.pathExists(srcDir))) return;

    const destDir = path.join(cwd, '.claude', 'commands');
    const files = await walk(srcDir);

    for (const absFile of files) {
        const rel = path.relative(srcDir, absFile).split(path.sep).join('/');
        const dest = path.join(destDir, rel);
        const exists = await fs.pathExists(dest);

        if (exists && !force) {
            log.skip(`.claude/commands/${rel}`);
            stats.skipped++;
            continue;
        }

        if (!dryRun) {
            await fs.ensureDir(path.dirname(dest));
            await fs.copy(absFile, dest);
        }
        log.ok(`.claude/commands/${rel}`);
        stats.added++;
    }
}

// Plugin-owned commands removed in past versions but may still linger in
// existing user installs. Listed by relative path under .claude/commands/.
// Cleaned up on every wipePluginOwnedCommands() call so `update` / `uninstall`
// drop them naturally.
const LEGACY_PLUGIN_COMMANDS = [
    'feature-modify-implement.md', // 0.4.0: merged into /feature-implement (auto new/modify routing)
];

// Remove only commands that this plugin owns (by filename match with skeleton).
// User-added commands in .claude/commands/ stay untouched.
async function wipePluginOwnedCommands(cwd, {dryRun, stats}) {
    const srcDir = path.join(SKELETON_DIR, '.claude', 'commands');
    if (!(await fs.pathExists(srcDir))) return;

    const destDir = path.join(cwd, '.claude', 'commands');
    if (!(await fs.pathExists(destDir))) return;

    const currentOwned = (await walk(srcDir)).map((f) => path.relative(srcDir, f).split(path.sep).join('/'));
    const ownedFiles = [...currentOwned, ...LEGACY_PLUGIN_COMMANDS];

    for (const rel of ownedFiles) {
        const dest = path.join(destDir, rel);
        if (!(await fs.pathExists(dest))) continue;
        if (!dryRun) await fs.remove(dest);
        log.ok(`.claude/commands/${rel} (removed)`);
        stats.removed++;
    }

    // If destDir is empty now, remove it too
    if (!dryRun) {
        const remaining = await fs.readdir(destDir).catch(() => []);
        if (remaining.length === 0) await fs.remove(destDir);
    }
}

// ─── Step 3: Merge .claude/settings.json ────────────────────────────────────
async function mergeClaudeSettings(cwd, {dryRun, stats}) {
    const partialPath = path.join(SKELETON_DIR, 'claude-settings.partial.json');
    const partial = await fs.readJson(partialPath);
    delete partial._comment;

    const destPath = path.join(cwd, '.claude', 'settings.json');
    const exists = await fs.pathExists(destPath);

    let target;
    if (exists) {
        try {
            target = await fs.readJson(destPath);
        } catch {
            log.warn('.claude/settings.json exists but is not valid JSON, skipping merge');
            return;
        }
    } else {
        target = {};
    }

    let changed = false;

    // Merge hooks.PostToolUse
    target.hooks ??= {};
    target.hooks.PostToolUse ??= [];
    for (const srcEntry of partial.hooks?.PostToolUse ?? []) {
        let matcherEntry = target.hooks.PostToolUse.find((e) => e.matcher === srcEntry.matcher);
        if (!matcherEntry) {
            target.hooks.PostToolUse.push(srcEntry);
            changed = true;
            continue;
        }
        matcherEntry.hooks ??= [];
        for (const srcHook of srcEntry.hooks ?? []) {
            const dup = matcherEntry.hooks.some((h) => h.type === srcHook.type && h.command === srcHook.command);
            if (!dup) {
                matcherEntry.hooks.push(srcHook);
                changed = true;
            }
        }
    }

    // Merge permissions.allow (union, dedup)
    target.permissions ??= {};
    target.permissions.allow ??= [];
    for (const rule of partial.permissions?.allow ?? []) {
        if (!target.permissions.allow.includes(rule)) {
            target.permissions.allow.push(rule);
            changed = true;
        }
    }

    if (changed) {
        if (!dryRun) {
            await fs.ensureDir(path.dirname(destPath));
            await fs.writeJson(destPath, target, {spaces: 2});
        }
        log.ok('.claude/settings.json (merged harness hooks + permissions)');
        stats.merged++;
    } else {
        log.skip('.claude/settings.json (already contains harness entries)');
        stats.skipped++;
    }
}

// ─── Step 4: Husky pre-commit ───────────────────────────────────────────────
async function mergeHuskyPreCommit(cwd, {dryRun, skipInstall, stats}) {
    // Check git repo
    const isGitRepo = await fs.pathExists(path.join(cwd, '.git'));
    if (!isGitRepo) {
        log.warn('not a git repository — .husky/pre-commit skipped');
        return;
    }

    // Check husky installed; install + init if missing
    const userPkgPath = path.join(cwd, 'package.json');
    const userPkg = await fs.readJson(userPkgPath);
    const hasHusky = userPkg.devDependencies?.husky || userPkg.dependencies?.husky;

    if (!hasHusky && !dryRun && !skipInstall) {
        log.info('husky not found, installing + initializing...');
        try {
            await execa('npm', ['install', '-D', 'husky'], {cwd, stdio: 'inherit'});
            await execa('npx', ['husky', 'init'], {cwd, stdio: 'inherit'});
        } catch (err) {
            log.warn(`husky setup failed: ${err.message}`);
            log.warn('Run "npx husky init" manually, then re-run this init.');
            return;
        }
    } else if (!hasHusky && skipInstall) {
        log.warn('husky not installed and --skip-install set, skipping pre-commit setup');
        return;
    }

    // Read skeleton pre-commit block
    const skelPath = path.join(SKELETON_DIR, 'husky-pre-commit.sh');
    const skelContent = await fs.readFile(skelPath, 'utf-8');

    const destPath = path.join(cwd, '.husky', 'pre-commit');
    const exists = await fs.pathExists(destPath);

    if (!exists) {
        if (!dryRun) {
            await fs.ensureDir(path.dirname(destPath));
            await fs.writeFile(destPath, skelContent, {mode: 0o755});
        }
        log.ok('.husky/pre-commit (created)');
        stats.added++;
        return;
    }

    const destContent = await fs.readFile(destPath, 'utf-8');
    if (destContent.includes(HARNESS_BLOCK_START) && destContent.includes(HARNESS_BLOCK_END)) {
        log.skip('.husky/pre-commit (harness block already present)');
        stats.skipped++;
        return;
    }

    // Append only the harness block portion (strip the shebang of skeleton file)
    const blockMatch = skelContent.match(
        new RegExp(`${HARNESS_BLOCK_START}[\\s\\S]*?${HARNESS_BLOCK_END}`)
    );
    const blockOnly = blockMatch ? blockMatch[0] : skelContent;
    const appended = destContent.trimEnd() + '\n\n' + blockOnly + '\n';

    if (!dryRun) {
        await fs.writeFile(destPath, appended);
    }
    log.ok('.husky/pre-commit (harness block appended)');
    stats.merged++;
}

// ─── Step 5: .gitignore ──────────────────────────────────────────────────────
async function appendGitignore(cwd, {dryRun, stats}) {
    const skelPath = path.join(SKELETON_DIR, 'gitignore-entries.txt');
    const entries = (await fs.readFile(skelPath, 'utf-8'))
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'));

    const destPath = path.join(cwd, '.gitignore');
    const exists = await fs.pathExists(destPath);
    const destContent = exists ? await fs.readFile(destPath, 'utf-8') : '';
    const existingLines = new Set(destContent.split('\n').map((l) => l.trim()));

    const toAppend = entries.filter((e) => !existingLines.has(e));

    if (toAppend.length === 0) {
        log.skip('.gitignore (harness entries already present)');
        stats.skipped++;
        return;
    }

    const appended = (destContent.trimEnd() ? destContent.trimEnd() + '\n\n' : '') +
        '# nestjs-harness-plugin\n' + toAppend.join('\n') + '\n';

    if (!dryRun) {
        await fs.writeFile(destPath, appended);
    }
    log.ok(`.gitignore (+${toAppend.length} entries)`);
    stats.merged++;
}

// ─── Utilities ──────────────────────────────────────────────────────────────
async function walk(dir) {
    const out = [];
    const entries = await fs.readdir(dir, {withFileTypes: true});
    for (const entry of entries) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...(await walk(p)));
        else out.push(p);
    }
    return out;
}
