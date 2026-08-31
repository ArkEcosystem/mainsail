// Builds the EVM native addon from source on platforms that have no prebuilt binary.
//
// Prebuilt `.node` binaries are delivered through the `optionalDependencies` in package.json
// (currently only linux x64/arm64 gnu). On any other platform npm/pnpm silently skip those
// optional packages and the napi loader in index.js finds no binding. This script runs on
// install and, when no binding is available, compiles one from the Rust source shipped in the
// tarball using the bundled @napi-rs/cli (so the package works on macOS, musl, etc.).

import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = dirname(scriptDir);
const require = createRequire(import.meta.url);

const log = (message) => console.log(`[@mainsail/evm] ${message}`);
const warn = (message) => console.warn(`[@mainsail/evm] ${message}`);

const force = process.env.MAINSAIL_EVM_FORCE_POSTINSTALL === "1";

// In the monorepo source checkout the native addon is built explicitly via `pnpm run build:rs`,
// not on install — building here too would slow every `pnpm install`. Only run when this package
// is installed as a dependency (i.e. it lives under a node_modules directory).
const installedAsDependency = packageDir.split(sep).includes("node_modules");
if (!installedAsDependency && !force) {
	log("source checkout detected; skipping postinstall (build with `pnpm run build:rs`).");
	process.exit(0);
}

// A binding may already be available: a prebuilt optionalDependency on a supported platform, or a
// previous from-source build. The napi loader in index.js resolves both, so reuse it.
try {
	require(join(packageDir, "index.js"));
	log("native binding available; nothing to build.");
	process.exit(0);
} catch {
	// No binding could be loaded — fall through and build one from source.
}

log(`no prebuilt binding for ${process.platform}-${process.arch}; building from source.`);

// Building from source needs the Rust source (shipped in the tarball) ...
const manifestPath = join(packageDir, "bindings", "Cargo.toml");
if (!existsSync(manifestPath)) {
	warn("Rust source not found; cannot build the native addon. The package will not work on this platform.");
	process.exit(1);
}

// ... and a Rust toolchain.
if (spawnSync("cargo", ["--version"], { stdio: "ignore" }).status !== 0) {
	warn("a Rust toolchain is required to build the native addon on this platform.");
	warn("install Rust from https://rustup.rs, then reinstall this package.");
	process.exit(1);
}

// Compile via the bundled @napi-rs/cli, mirroring the package's `build-napi` script. `--platform`
// makes napi name the output `evm.<host-triple>.node`, which index.js loads relative to itself.
const napiCli = join(dirname(require.resolve("@napi-rs/cli/package.json")), "dist", "cli.js");
const result = spawnSync(
	process.execPath,
	[napiCli, "build", "--platform", "--release", "--manifest-path", "bindings/Cargo.toml", "--output-dir", "."],
	{ cwd: packageDir, stdio: "inherit" },
);

if (result.status !== 0) {
	warn("failed to build the native addon from source.");
	process.exit(result.status ?? 1);
}

log("native addon built successfully.");

// The from-source build leaves cargo's `target/` directory (hundreds of MB of intermediate
// artifacts) inside the installed package. napi has already copied the compiled `.node` into the
// package dir, so the target dir is no longer needed — remove it to reclaim disk space.
try {
	const metadata = spawnSync(
		"cargo",
		["metadata", "--no-deps", "--format-version", "1", "--manifest-path", "bindings/Cargo.toml"],
		{ cwd: packageDir, encoding: "utf8" },
	);

	const targetDir =
		metadata.status === 0 && metadata.stdout
			? JSON.parse(metadata.stdout).target_directory
			: join(packageDir, "target");

	if (targetDir && existsSync(targetDir)) {
		rmSync(targetDir, { recursive: true, force: true });
		log(`removed cargo build directory ${targetDir}.`);
	}
} catch (error) {
	warn(`could not remove cargo build directory: ${error.message}`);
}
