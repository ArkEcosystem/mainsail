import { inject, injectable } from "@mainsail/container";
import { Constants } from "@mainsail/contracts";
import { parse, stringify } from "envfile";
import { existsSync, readFileSync, writeFileSync } from "fs-extra";
import path from "path";

import { envPaths as environmentPaths, Paths } from "../env-paths";
import { Identifiers } from "../ioc";

@injectable()
export class Environment {
	@inject(Identifiers.Application.Name)
	private readonly appName!: string;

	public getPaths(): Paths {
		let paths: Paths = environmentPaths.get("mainsail", { suffix: "" });

		for (const [key, value] of Object.entries(paths)) {
			paths[key] = path.join(value, this.appName);
		}

		if (process.env[Constants.EnvironmentVariables.CORE_PATH_CONFIG]) {
			paths = {
				...paths,
				config: path.resolve(process.env[Constants.EnvironmentVariables.CORE_PATH_CONFIG]!, this.appName),
			};
		}

		if (process.env[Constants.EnvironmentVariables.CORE_PATH_DATA]) {
			paths = {
				...paths,
				data: path.resolve(process.env[Constants.EnvironmentVariables.CORE_PATH_DATA]!, this.appName),
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
