import { inject, injectable } from "@mainsail/container";
import { Constants } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { readJSON } from "fs-extra";
import path from "path";

import { Application } from "../contracts";
import { envPaths as environmentPaths } from "../env-paths";
import { Identifiers } from "../ioc";

interface Config {
	token: string;
	network: string;
}

@injectable()
export class DiscoverConfig {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Application;

	public async discover(): Promise<Config | undefined> {
		const applicationName = this.app.get<string>(Identifiers.Application.Name);
		Utils.assert.defined<string>(applicationName);

		try {
			return await readJSON(
				path.join(
					process.env[Constants.EnvironmentVariables.CORE_PATH_CONFIG]!,
					applicationName,
					"config.json",
				),
			);
		} catch {}

		try {
			return await readJSON(
				path.join(environmentPaths.get(applicationName, { suffix: "" }).config, "config.json"),
			);
		} catch {}

		return undefined;
	}
}
