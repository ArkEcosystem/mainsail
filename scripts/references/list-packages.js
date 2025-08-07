import { resolve, join } from "path";
import { lstatSync, readdirSync, readFileSync, writeFileSync} from "fs";

const source = resolve(join(process.cwd(), "packages"));

const main = async () => {
		const pkgs = readdirSync(source)
		.filter((name) => lstatSync(`${source}/${name}`).isDirectory())
		.filter((name) => name !== "evm")
		.sort();

		for (const pkg of pkgs) {
			console.log(`{ "path": "packages/${pkg}" },`);
		}
}

main();
