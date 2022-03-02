import { Kernel } from "@arkecosystem/core-contracts";
import { resolve } from "path";

import { Identifiers, inject, injectable } from "../../ioc";
import { assert } from "../../utils";
import { Bootstrapper } from "../interfaces";

@injectable()
export class RegisterBaseBindings implements Bootstrapper {
	@inject(Identifiers.Application)
	private readonly app!: Kernel.Application;

	public async bootstrap(): Promise<void> {
		const flags: Record<string, string> | undefined = this.app.config("app.flags");
		const { version } = require(resolve(__dirname, "../../../package.json"));

		assert.defined<Record<string, string>>(flags);

		this.app.bind<string>(Identifiers.ApplicationEnvironment).toConstantValue(flags.env);
		this.app.bind<string>(Identifiers.ApplicationToken).toConstantValue(flags.token);
		this.app.bind<string>(Identifiers.ApplicationNetwork).toConstantValue(flags.network);
		this.app.bind<string>(Identifiers.ApplicationVersion).toConstantValue(version);

		// @todo: implement a getter/setter that sets vars locally and in the process.env variables
		process.env.CORE_ENV = flags.env;
		// process.env.NODE_ENV = process.env.CORE_ENV;
		process.env.CORE_TOKEN = flags.token;
		process.env.CORE_NETWORK_NAME = flags.network;
		process.env.CORE_VERSION = version;
	}
}
