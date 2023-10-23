import { inject, injectable } from "@mainsail/container";
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
	@inject(Identifiers.Application)
	private readonly app!: Application;

	public async discover(token = "", network = ""): Promise<Config | undefined> {
		const applicationName = this.app.get<string>(Identifiers.ApplicationName);
		Utils.assert.defined<string>(applicationName);

		try {
			return await readJSON(path.join(process.env[`CORE_PATH_CONFIG`]!, applicationName, "config.json"));
		} catch {}

		try {
			return await readJSON(
				path.join(
					environmentPaths.get(token, { suffix: "core" }).config,
					network,
					applicationName,
					"config.json",
				),
			);
		} catch {}

		return undefined;
	}
}
