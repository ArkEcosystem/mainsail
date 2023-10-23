import { injectable } from "@mainsail/container";
import { parseFileSync, stringifySync } from "envfile";
import { existsSync, writeFileSync } from "fs-extra";
import path from "path";

import { envPaths as environmentPaths, Paths } from "../env-paths";

@injectable()
export class Environment {
	public getPaths(token: string, network: string, name: string): Paths {
		let paths: Paths = environmentPaths.get(token, { suffix: "core" });

		for (const [key, value] of Object.entries(paths)) {
			paths[key] = `${value}/${network}/${name}`;
		}

		if (process.env["CORE_PATH_CONFIG"]) {
			paths = {
				...paths,
				config: path.resolve(process.env["CORE_PATH_CONFIG"]!, name),
			};
		}

		if (process.env["CORE_PATH_DATA"]) {
			paths = {
				...paths,
				data: path.resolve(process.env["CORE_PATH_DATA"]!, name),
			};
		}

		return paths;
	}

	public updateVariables(environmentFile: string, variables: Record<string, string | number>): void {
		if (!existsSync(environmentFile)) {
			throw new Error(`No environment file found at ${environmentFile}.`);
		}

		const environment: object = parseFileSync(environmentFile);

		for (const [key, value] of Object.entries(variables)) {
			environment[key] = value;
		}

		writeFileSync(environmentFile, stringifySync(environment).trim());
	}
}
