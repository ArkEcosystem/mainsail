import { resolve, join } from "path";
import { lstatSync, readdirSync, readFileSync, writeFileSync} from "fs";

const source = resolve(join(process.cwd(), "packages"));

const clearReferences = (tsconfigPath, tsconfig) => {
	if (tsconfig.references) {
		delete tsconfig.references;
		writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, `\t`) + "\n", "utf-8");
	}
};

const main = async () => {
		const pkgs = readdirSync(source)
		.filter((name) => lstatSync(`${source}/${name}`).isDirectory())
		.filter((name) => name !== "evm")
		.sort();

		for (const pkg of pkgs) {
			const pkgPath = join(source, pkg);
			const tsconfigPath = join(pkgPath, "tsconfig.json");
			const packageJsonPath = join(pkgPath, "package.json");

			// console.log(`Reading ${packageJsonPath}`);
			// console.log(`Updating ${tsconfigPath}`);

			// Import package json
			const packageJson = JSON.parse(
				readFileSync(packageJsonPath, "utf-8")
			);
			// Import tsconfig
			const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf-8"));

			// Check if package.json has dependencies
			if (!packageJson.dependencies) {
				console.warn(`No dependencies found in ${packageJson.name}`);
				clearReferences(tsconfigPath, tsconfig);
				continue;
			}

			// Find dependencies that are in the same workspace. They have "workspace:^" in their version
			const workspaceDeps = Object.entries(packageJson.dependencies)
				.filter(([_, version]) => typeof version === 'string' && version.startsWith('workspace:'))
				.map(([name]) => name);

			if (workspaceDeps.length === 0) {
				console.log(`No workspace dependencies for ${packageJson.name}`);
				clearReferences(tsconfigPath, tsconfig);
				continue;
			}

			console.log(`Found dependencies for   ${packageJson.name}: \n${workspaceDeps.join('\n')}`);


			// Update tsconfig.json
			tsconfig.references = workspaceDeps.map(depName => {
				return { path: `../${depName.split('/').pop()}` };
			});
			writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, `\t`) + "\n", "utf-8");
		}
}

main();
