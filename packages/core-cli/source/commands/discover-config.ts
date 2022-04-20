import { Constants } from "@arkecosystem/core-contracts";
import { readJSON } from "fs-extra";
import path from "path";

import { envPaths as environmentPaths } from "../env-paths";
import { injectable } from "../ioc";

interface Config {
	token: string;
	network: string;
}

@injectable()
export class DiscoverConfig {
	public async discover(token = "", network = ""): Promise<Config | undefined> {
		try {
			return await readJSON(path.join(process.env[Constants.Flags.CORE_PATH_CONFIG]!, "config.json"));
		} catch {}

		try {
			return await readJSON(
				path.join(environmentPaths.get(token, { suffix: "core" }).config, network, "config.json"),
			);
		} catch {}

		return undefined;
	}
}
