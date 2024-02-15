import { injectable } from "@mainsail/container";
import { Constants } from "@mainsail/contracts";
import { parse, stringify } from "envfile";
import { existsSync, readFileSync, writeFileSync } from "fs-extra";
import path from "path";

import { envPaths as environmentPaths, Paths } from "../env-paths";

@injectable()
export class Environment {
	public getPaths(token: string, network: string, name: string): Paths {
		let paths: Paths = environmentPaths.get(token, { suffix: "core" });

		for (const [key, value] of Object.entries(paths)) {
			paths[key] = `${value}/${network}/${name}`;
		}

		if (process.env[Constants.EnvironmentVariables.CORE_PATH_CONFIG]) {
			paths = {
				...paths,
				config: path.resolve(process.env[Constants.EnvironmentVariables.CORE_PATH_CONFIG]!, name),
			};
		}

		if (process.env[Constants.EnvironmentVariables.CORE_PATH_DATA]) {
			paths = {
				...paths,
				data: path.resolve(process.env[Constants.EnvironmentVariables.CORE_PATH_DATA]!, name),
			};
		}

		return paths;
	}

	public updateVariables(environmentFile: string, variables: Record<string, string | number>): void {
		if (!existsSync(environmentFile)) {
			throw new Error(`No environment file found at ${environmentFile}.`);
		}

		const environment: object = parse(readFileSync(environmentFile).toString("utf8"));
		for (const [key, value] of Object.entries(variables)) {
			environment[key] = value;
		}

		writeFileSync(environmentFile, stringify(environment).trim());
	}
}
