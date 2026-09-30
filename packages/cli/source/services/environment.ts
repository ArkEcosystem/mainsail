import type { Contracts } from "@mainsail/contracts";

import { EnvironmentVariables, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { parse, stringify } from "envfile";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { envPaths as environmentPaths } from "../env-paths.js";

@injectable()
export class Environment implements Contracts.Cli.Environment {
	@inject(Identifiers.Cli.Application.Name)
	private readonly appName!: string;

	public getPaths(): Contracts.Cli.Paths {
		let paths: Contracts.Cli.Paths = environmentPaths.get("mainsail", { suffix: "" });

		for (const [key, value] of Object.entries(paths)) {
			paths[key] = path.join(value, this.appName);
		}

		const pathConfig = process.env[EnvironmentVariables.MAINSAIL_PATH_CONFIG];
		if (pathConfig) {
			paths = {
				...paths,
				config: path.resolve(pathConfig, this.appName),
			};
		}

		const pathData = process.env[EnvironmentVariables.MAINSAIL_PATH_DATA];
		if (pathData) {
			paths = {
				...paths,
				data: path.resolve(pathData, this.appName),
			};
		}

		return paths;
	}

	public updateVariables(environmentFile: string, variables: Contracts.Cli.InputValues): void {
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
