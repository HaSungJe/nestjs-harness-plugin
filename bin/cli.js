#!/usr/bin/env node
import { program } from 'commander';
import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SKELETON_DIR = path.resolve(__dirname, '..', 'skeleton');
const PKG_NAME = 'nestjs-harness-plugin';
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
    .version('0.1.0');

program
    .command('init')
    .description('Inject harness into current project')
    .option('-f, --force', 'overwrite existing files')
    .option('-d, --dry-run', 'preview changes without writing')
    .option('--skip-install', 'skip npm install step')
    .action(runInit);

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
    log.info('\n[1/5] Copying .harness/ scaffold...');
    await copyHarness(cwd, projectName, {force, dryRun, stats});

    // 3. Merge .claude/settings.json
    log.info('\n[2/5] Merging .claude/settings.json...');
    await mergeClaudeSettings(cwd, {dryRun, stats});

    // 4. Ensure husky + merge .husky/pre-commit
    log.info('\n[3/5] Configuring .husky/pre-commit...');
    await mergeHuskyPreCommit(cwd, {dryRun, skipInstall, stats});

    // 5. Append .gitignore
    log.info('\n[4/5] Updating .gitignore...');
    await appendGitignore(cwd, {dryRun, stats});

    // 6. Install self as devDependency
    if (!dryRun && !skipInstall) {
        log.info('\n[5/5] Installing nestjs-harness-plugin as devDependency...');
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
    console.log('  2. Add the routing block to CLAUDE.md — see .harness/README.md §2');
    console.log('  3. Try ' + c.cyan('"user 도메인 생성"') + ' in Claude Code');
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
