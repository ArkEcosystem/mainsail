import { Constants } from "@arkecosystem/core-contracts";
import { parseFileSync, stringifySync } from "envfile";
import { existsSync, writeFileSync } from "fs-extra";
import { resolve } from "path";

import { envPaths, Paths } from "../env-paths";
import { injectable } from "../ioc";

@injectable()
export class Environment {
	public getPaths(token: string, network: string): Paths {
		let paths: Paths = envPaths.get(token, { suffix: "core" });

		for (const [key, value] of Object.entries(paths)) {
			paths[key] = `${value}/${network}`;
		}

		if (process.env[Constants.Flags.CORE_PATH_CONFIG]) {
			paths = {
				...paths,
				config: resolve(process.env[Constants.Flags.CORE_PATH_CONFIG]),
			};
		}

		if (process.env[Constants.Flags.CORE_PATH_DATA]) {
			paths = {
				...paths,
				data: resolve(process.env[Constants.Flags.CORE_PATH_DATA]),
			};
		}

		return paths;
	}

	public updateVariables(envFile: string, variables: Record<string, string | number>): void {
		if (!existsSync(envFile)) {
			throw new Error(`No environment file found at ${envFile}.`);
		}

		const env: object = parseFileSync(envFile);

		for (const [key, value] of Object.entries(variables)) {
			env[key] = value;
		}

		writeFileSync(envFile, stringifySync(env).trim());
	}
}
