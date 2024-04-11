#!/usr/bin/env node

import child_process from "child_process";
import { CommandLineInterface } from "../distribution/index.js";

const jemallocPath = child_process
	.spawnSync(
		`ls -d1H $(gcc -print-search-dirs | grep libraries: | awk '{print $2}' | sed -e 's/:/* /g' -e 's/$/*/' -e 's/^.//') | grep libjemalloc.so || ls -d1H /usr/lib/* | grep libjemalloc.so`,
		{ shell: true },
	)
	.stdout.toString()
	.split("\n")
	.shift()
	.trim();

if (jemallocPath) {
	if (process.env.LD_PRELOAD !== jemallocPath) {
		process.env.LD_PRELOAD = jemallocPath;
		let exitCode = 0;
		try {
			child_process.execFileSync(process.argv0, process.argv.slice(1), { stdio: [0, 1, 2] });
		} catch (error) {
			exitCode = error.status;
		}
		process.exitCode = exitCode;
		process.exit();
	}
} else {
	console.error(
		"The jemalloc library was not found on your system. It is recommended to install it for better memory management. Falling back to the system default...",
	);
}

const main = async () => {
	try {
		const cmd = new CommandLineInterface(process.argv.slice(2));
		await cmd.execute();
	} catch (error) {
		if (error.name !== "FatalException") {
			console.error(error);
		}

		process.exitCode = 1;
	}
};

main();
