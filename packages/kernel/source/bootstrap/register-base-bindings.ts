import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { assert } from "@mainsail/utils";
import path from "path";
import { URL } from "url";

type Flags = {
	env?: string;
	name?: string;
	thread?: string;
};

@injectable()
export class RegisterBaseBindings implements Contracts.Kernel.Bootstrapper {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Filesystem.Service)
	private readonly fileSystem!: Contracts.Kernel.Filesystem;

	public async bootstrap(): Promise<void> {
		const flags = this.app.config<Flags>("app.flags");

		const { version } = this.fileSystem.readJSONSync<Contracts.Types.PackageJson>(
			path.resolve(new URL(".", import.meta.url).pathname, "../../package.json"),
		);

		assert.defined(version);
		assert.defined(flags);
		assert.defined(flags.env);
		assert.defined(flags.name);

		this.app.bind<string>(Identifiers.Application.Environment).toConstantValue(flags.env);
		this.app.bind<string>(Identifiers.Application.Name).toConstantValue(flags.name);
		this.app.bind<string>(Identifiers.Application.Thread).toConstantValue(flags.thread || "main");
		this.app.bind<string>(Identifiers.Application.Version).toConstantValue(version);
	}
}
