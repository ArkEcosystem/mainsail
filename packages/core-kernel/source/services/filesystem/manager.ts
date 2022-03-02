import { Kernel } from "@arkecosystem/core-contracts";
import { InstanceManager } from "../../support/instance-manager";
import { LocalFilesystem } from "./drivers/local";

export class FilesystemManager extends InstanceManager<Kernel.Filesystem> {
	protected async createLocalDriver(): Promise<Kernel.Filesystem> {
		return this.app.resolve(LocalFilesystem).make();
	}

	protected getDefaultDriver(): string {
		return "local";
	}
}
