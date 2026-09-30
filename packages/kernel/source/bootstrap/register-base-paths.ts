import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { camelCase, expandTilde, set } from "@mainsail/utils";
import envPaths from "env-paths";
import { join, resolve } from "path";

@injectable()
export class RegisterBasePaths implements Contracts.Kernel.Bootstrapper {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Filesystem.Service)
	private readonly fileSystem!: Contracts.Kernel.Filesystem;

	public async bootstrap(): Promise<void> {
		const paths = Object.entries(envPaths("mainsail", { suffix: "" }));

		for (let [type, path] of paths) {
			path = join(path, this.app.name());

			const configKey = `MAINSAIL_PATH_${type.toUpperCase()}`;
			const processPath: string | undefined = process.env[configKey];

			// 1. Check if a path is defined via process variables.
			if (processPath) {
				if (!this.app.isWorker()) {
					path = join(processPath, this.app.name());
				} else {
					// Path already correct, due to the env being inherited from the parent process.
					path = processPath;
				}
			}

			path = resolve(expandTilde(path));
			this.fileSystem.ensureDirSync(path);

			set(process.env, configKey, path);
			this.app[camelCase(`use_${type}_path`)](path);
			this.app.rebind<string>(`path.${type}`).toConstantValue(path);
		}
	}
}
