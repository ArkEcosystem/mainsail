import { inject, injectable } from "@arkecosystem/core-container";
import { Identifiers, Contracts } from "@arkecosystem/core-contracts";
import { camelCase, expandTilde, set } from "@arkecosystem/utils";
import envPaths from "env-paths";
import { ensureDirSync } from "fs-extra";
import { resolve } from "path";

import { ConfigRepository } from "../../services/config";
import { assert } from "../../utils";
import { Bootstrapper } from "../interfaces";

@injectable()
export class RegisterBasePaths implements Bootstrapper {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.ConfigRepository)
	private readonly configRepository!: ConfigRepository;

	public async bootstrap(): Promise<void> {
		const paths: Array<[string, string]> = Object.entries(envPaths(this.app.token(), { suffix: "core" }));

		for (let [type, path] of paths) {
			const processPath: string | undefined = process.env[`CORE_PATH_${type.toUpperCase()}`];

			if (processPath) {
				// 1. Check if a path is defined via process variables.
				path = processPath;
			} else if (this.configRepository.has(`app.flags.paths.${type}`)) {
				// 2. Check if a path is defined via configuration repository.
				path = this.configRepository.get(`app.flags.paths.${type}`);
			} else {
				// 3. If the default path is used we'll append the network name to it.
				path = `${path}/${this.app.network()}`;
			}

			path = resolve(expandTilde(path));

			assert.defined<string>(path);

			ensureDirSync(path);

			set(process.env, `CORE_PATH_${type.toUpperCase()}`, path);

			const pathMethod: string | undefined = camelCase(`use_${type}_path`);

			assert.defined<string>(pathMethod);

			this.app[pathMethod](path);

			this.app.rebind<string>(`path.${type}`).toConstantValue(path);
		}
	}
}
