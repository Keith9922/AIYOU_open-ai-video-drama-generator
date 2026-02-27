/**
 * AIYOU Server Build Script
 * 将 Express 后端打包为 Tauri sidecar
 *
 * 策略：
 * 1. 用 esbuild 将 server/index.js 打包为单文件 CJS bundle
 * 2. 生成 shell 脚本 wrapper 作为 sidecar 入口
 * 3. 产物放入 src-tauri/binaries/
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const BINARIES_DIR = path.join(ROOT, 'src-tauri', 'binaries');
const SERVER_DIR = path.join(ROOT, 'server');

// 获取当前平台的 target triple
function getTargetTriple() {
  try {
    const output = execSync('rustc -vV', { encoding: 'utf8' });
    const match = output.match(/host:\s+(.+)/);
    return match ? match[1].trim() : null;
  } catch {
    const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
    const platform = process.platform;
    if (platform === 'darwin') return `${arch}-apple-darwin`;
    if (platform === 'win32') return `${arch}-pc-windows-msvc`;
    return `${arch}-unknown-linux-gnu`;
  }
}

function getNodeRuntimeFileName(target) {
  return target.includes('windows')
    ? `node-runtime-${target}.exe`
    : `node-runtime-${target}`;
}

function copyNodeRuntime(target) {
  const runtimeFileName = getNodeRuntimeFileName(target);
  const runtimePath = path.join(BINARIES_DIR, runtimeFileName);
  const sourceRuntime = process.env.AIYOU_NODE_RUNTIME_PATH || process.execPath;

  if (!fs.existsSync(sourceRuntime)) {
    throw new Error(`[build-server] Node runtime not found: ${sourceRuntime}`);
  }

  fs.copyFileSync(sourceRuntime, runtimePath);
  if (!target.includes('windows')) {
    fs.chmodSync(runtimePath, 0o755);
  }

  console.log(`[build-server] Bundled Node runtime: ${sourceRuntime} -> ${runtimePath}`);
  return runtimeFileName;
}

async function build() {
  const targetTriple = getTargetTriple();
  console.log(`[build-server] Target: ${targetTriple}`);

  // 1. 确保 binaries 目录存在
  fs.mkdirSync(BINARIES_DIR, { recursive: true });

  // 2. 安装 server 依赖（仅当缺失时）
  const serverNodeModules = path.join(SERVER_DIR, 'node_modules');
  if (!fs.existsSync(serverNodeModules)) {
    console.log('[build-server] Installing server dependencies...');
    execSync('pnpm install', { cwd: SERVER_DIR, stdio: 'inherit' });
  } else {
    console.log('[build-server] Reusing existing server/node_modules');
  }

  // 3. 用 esbuild JS API 打包 server
  console.log('[build-server] Bundling server with esbuild...');
  const bundlePath = path.join(BINARIES_DIR, 'server-bundle.cjs');

  await esbuild.build({
    entryPoints: [path.join(SERVER_DIR, 'index.js')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: bundlePath,
    external: [
      'better-sqlite3',
      // Knex optional database drivers (not installed, loaded dynamically)
      'mysql', 'mysql2', 'pg-query-stream', 'tedious', 'sqlite3', 'oracledb',
    ],
    banner: {
      js: [
        '// ESM compatibility shim for CJS bundle',
        'const __importMetaUrl = require("url").pathToFileURL(__filename).href;',
      ].join('\n'),
    },
    define: {
      'import.meta.url': '__importMetaUrl',
    },
  });

  console.log(`[build-server] Bundle created: ${bundlePath}`);

  // 4. 复制 better-sqlite3 native addon
  const sqliteModuleSrc = path.join(SERVER_DIR, 'node_modules', 'better-sqlite3');
  const sqliteModuleDst = path.join(BINARIES_DIR, 'node_modules', 'better-sqlite3');
  if (fs.existsSync(sqliteModuleSrc)) {
    console.log('[build-server] Copying better-sqlite3 native module...');
    fs.mkdirSync(path.dirname(sqliteModuleDst), { recursive: true });
    // Remove old copy if exists
    if (fs.existsSync(sqliteModuleDst)) {
      fs.rmSync(sqliteModuleDst, { recursive: true });
    }
    fs.cpSync(sqliteModuleSrc, sqliteModuleDst, { recursive: true });
  }

  // 5. 复制 .env 文件（如果存在）
  const envSrc = path.join(ROOT, '.env');
  const envDst = path.join(BINARIES_DIR, '.env');
  if (fs.existsSync(envSrc)) {
    fs.copyFileSync(envSrc, envDst);
    console.log('[build-server] Copied .env');
  }

  // 6. 创建 sidecar 启动脚本
  // 支持通过 CLI 参数指定额外的 target triples（用于多平台构建）
  const extraTargets = process.argv.slice(2);
  const allTargets = extraTargets.length > 0
    ? new Set(extraTargets)
    : new Set([targetTriple]);

  for (const target of allTargets) {
    const isWindows = target.includes('windows');
    const runtimeFileName = copyNodeRuntime(target);

    if (isWindows) {
      // Tauri expects .exe for sidecar on Windows
      // Copy node.exe as the sidecar, Rust code will pass server-bundle.cjs as arg
      const nodeExe = process.execPath; // path to current node.exe
      const sidecarPath = path.join(BINARIES_DIR, `aiyou-server-${target}.exe`);
      fs.copyFileSync(nodeExe, sidecarPath);
      console.log(`[build-server] Created Windows sidecar (node.exe copy): ${sidecarPath}`);
    } else {
      // macOS/Linux: shell script wrapper
      // In .app bundle: sidecar is in Contents/MacOS/, resources in Contents/Resources/binaries/
      // In dev mode: everything is in src-tauri/binaries/
      const shContent = `#!/bin/sh
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
BUNDLE="$DIR/server-bundle.cjs"
if [ ! -f "$BUNDLE" ]; then
  BUNDLE="$DIR/../Resources/binaries/server-bundle.cjs"
fi

NODE_BIN="$DIR/${runtimeFileName}"
if [ ! -f "$NODE_BIN" ]; then
  NODE_BIN="$DIR/../Resources/binaries/${runtimeFileName}"
fi

if [ ! -f "$NODE_BIN" ]; then
  echo "[aiyou-server] Node runtime not found: ${runtimeFileName}" >&2
  exit 1
fi

if [ -z "$NODE_PATH" ]; then
  NODE_PATH_CANDIDATE="$DIR/node_modules"
  if [ ! -d "$NODE_PATH_CANDIDATE" ]; then
    NODE_PATH_CANDIDATE="$DIR/../Resources/binaries/node_modules"
  fi
  export NODE_PATH="$NODE_PATH_CANDIDATE"
fi
if [ -z "$DB_CLIENT" ]; then
  export DB_CLIENT=sqlite
fi
exec "$NODE_BIN" "$BUNDLE" "$@"
`;
      const shPath = path.join(BINARIES_DIR, `aiyou-server-${target}`);
      fs.writeFileSync(shPath, shContent);
      fs.chmodSync(shPath, 0o755);
      console.log(`[build-server] Created sidecar: ${shPath}`);
    }
  }

  console.log('[build-server] Done!');
}

build().catch((err) => {
  console.error('[build-server] Failed:', err);
  process.exit(1);
});
