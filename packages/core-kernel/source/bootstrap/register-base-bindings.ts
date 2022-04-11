import { inject, injectable } from "@arkecosystem/core-container";
import { Constants, Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { resolve } from "path";

import { assert } from "../utils";
import { Bootstrapper } from "./interfaces";

@injectable()
export class RegisterBaseBindings implements Bootstrapper {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	public async bootstrap(): Promise<void> {
		const flags: Record<string, string> | undefined = this.app.config("app.flags");
		const { version } = require(resolve(__dirname, "../../package.json"));

		assert.defined<Record<string, string>>(flags);

		this.app.bind<string>(Identifiers.ApplicationEnvironment).toConstantValue(flags.env);
		this.app.bind<string>(Identifiers.ApplicationToken).toConstantValue(flags.token);
		this.app.bind<string>(Identifiers.ApplicationNetwork).toConstantValue(flags.network);
		this.app.bind<string>(Identifiers.ApplicationVersion).toConstantValue(version);

		// @@TODO implement a getter/setter that sets vars locally and in the process.env variables
		process.env[Constants.Flags.CORE_ENV] = flags.env;
		// process.env[Constants.Flags.CORE_ENV] = process.env.CORE_ENV;
		process.env[Constants.Flags.CORE_TOKEN] = flags.token;
		process.env[Constants.Flags.CORE_NETWORK_NAME] = flags.network;
		process.env[Constants.Flags.CORE_VERSION] = version;
	}
}
