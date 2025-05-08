import { injectable, injectFromBase } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { InstanceManager } from "../../support/instance-manager.js";
import { LocalFilesystem } from "./drivers/local.js";

@injectable()
@injectFromBase()
export class FilesystemManager extends InstanceManager<Contracts.Kernel.Filesystem> {
	protected async createLocalDriver(): Promise<Contracts.Kernel.Filesystem> {
		return this.app.resolve(LocalFilesystem).make();
	}

	protected getDefaultDriver(): string {
		return "local";
	}
}
