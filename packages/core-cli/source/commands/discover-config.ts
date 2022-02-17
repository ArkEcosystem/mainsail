import envPaths from "env-paths";
import { readJSON } from "fs-extra";
import { join } from "path";

import { injectable } from "../ioc";

interface Config {
	token: string;
	network: string;
}

@injectable()
export class DiscoverConfig {
	public async discover(token = "", network = ""): Promise<Config | undefined> {
		try {
			return await readJSON(join(process.env.CORE_PATH_CONFIG!, "config.json"));
		} catch {}

		try {
			return await readJSON(join(envPaths(token, { suffix: "core" }).config, network, "config.json"));
		} catch {}

		return undefined;
	}
}
