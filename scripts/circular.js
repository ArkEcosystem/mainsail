import chalk from "chalk";
import madge from "madge";
import { resolve, join } from "path";
import { lstatSync, readdirSync } from "fs";

const source = resolve(join(process.cwd(), "packages"));

const main = async () => {
	const pkgs = readdirSync(source)
		.filter((name) => lstatSync(`${source}/${name}`).isDirectory())
		.filter((name) => name !== "evm")
		.sort();

	let pass = true;

	for (const pkg of pkgs) {
		const fullPath = `${source}/${pkg}/source`;

		const res = await madge(fullPath, {
			fileExtensions: ["ts"],
		});

		const circularDependencies = res.circular();

		if (circularDependencies.length > 0) {
			pass = false;

			console.log(
				chalk.bgRed.white.bold(`[${pkg}]: Found ${circularDependencies.length} circular dependencies!`),
			);

			for (let i = 0; i < circularDependencies.length; i++) {
				const tree = [];

				tree.push(chalk.gray(`${i + 1}) `));

				for (let j = 0; j < circularDependencies[i].length; j++) {
					tree.push(chalk.cyan.bold(circularDependencies[i][j]));

					if (j !== circularDependencies[i].length - 1) {
						tree.push(chalk.gray(" > "));
					}
				}

				console.log(tree.join(""));
			}
		}
	}

	if (!pass) {
		process.exit(1);
	}
};

await main();
