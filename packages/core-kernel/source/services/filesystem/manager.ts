import { Filesystem } from "../../contracts/kernel/filesystem";
import { InstanceManager } from "../../support/instance-manager";
import { LocalFilesystem } from "./drivers/local";

export class FilesystemManager extends InstanceManager<Filesystem> {
	protected async createLocalDriver(): Promise<Filesystem> {
		return this.app.resolve(LocalFilesystem).make();
	}

	protected getDefaultDriver(): string {
		return "local";
	}
}
