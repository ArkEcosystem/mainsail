import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { camelCase, expandTilde, set } from "@mainsail/utils";
import envPaths from "env-paths";
import { join, resolve } from "path";

import { ConfigRepository } from "../services/config/index.js";
import { assert } from "../utils/assert.js";

@injectable()
export class RegisterBasePaths implements Contracts.Kernel.Bootstrapper {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Config.Repository)
	private readonly configRepository!: ConfigRepository;

	@inject(Identifiers.Services.Filesystem.Service)
	private readonly fileSystem!: Contracts.Kernel.Filesystem;

	public async bootstrap(): Promise<void> {
		const paths: Array<[string, string]> = Object.entries(envPaths("mainsail", { suffix: "" }));

		for (let [type, path] of paths) {
			path = join(path, this.app.name());

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

			this.fileSystem.ensureDirSync(path);

			set(process.env, configKey, path);

			const pathMethod: string | undefined = camelCase(`use_${type}_path`);

			assert.defined<string>(pathMethod);

			this.app[pathMethod](path);

			this.app.rebind<string>(`path.${type}`).toConstantValue(path);
		}
	}
}
