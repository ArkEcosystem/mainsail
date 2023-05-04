import { Contracts } from "@mainsail/contracts";

import { InstanceManager } from "../../support/instance-manager";
import { LocalFilesystem } from "./drivers/local";

export class FilesystemManager extends InstanceManager<Contracts.Kernel.Filesystem> {
	protected async createLocalDriver(): Promise<Contracts.Kernel.Filesystem> {
		return this.app.resolve(LocalFilesystem).make();
	}

	protected getDefaultDriver(): string {
		return "local";
	}
}
