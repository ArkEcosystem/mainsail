import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { camelCase, expandTilde, set } from "@mainsail/utils";
import envPaths from "env-paths";
import { ensureDirSync } from "fs-extra";
import { join, resolve } from "path";

import { ConfigRepository } from "../services/config";
import { assert } from "../utils";
import { Bootstrapper } from "./interfaces";

@injectable()
export class RegisterBasePaths implements Bootstrapper {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Config.Repository)
	private readonly configRepository!: ConfigRepository;

	public async bootstrap(): Promise<void> {
		const paths: Array<[string, string]> = Object.entries(envPaths(this.app.name(), { suffix: "" }));

		for (let [type, path] of paths) {
			const configKey = `CORE_PATH_${type.toUpperCase()}`;

			const processPath: string | undefined = process.env[configKey];

			// 1. Check if a path is defined via process variables.
			if (processPath) {
				if (!this.app.isWorker()) {
					path = join(processPath, this.app.name());
				} else {
					// Path already correct, due to the env being inherited from the parent process.
					path = processPath;
				}
			} else if (this.configRepository.has(`app.flags.paths.${type}`)) {
				// 2. Check if a path is defined via configuration repository.
				path = this.configRepository.get(`app.flags.paths.${type}`);
			}

			path = resolve(expandTilde(path));

			assert.defined<string>(path);

			ensureDirSync(path);

			set(process.env, configKey, path);

			const pathMethod: string | undefined = camelCase(`use_${type}_path`);

			assert.defined<string>(pathMethod);

			this.app[pathMethod](path);

			this.app.rebind<string>(`path.${type}`).toConstantValue(path);
		}
	}
}
