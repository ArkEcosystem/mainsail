import { interfaces } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { FilesystemManager } from "./manager";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind<FilesystemManager>(Identifiers.Kernel.Filesystem.Manager)
			.to(FilesystemManager)
			.inSingletonScope();

		await this.app.get<FilesystemManager>(Identifiers.Kernel.Filesystem.Manager).boot();

		this.app
			.bind(Identifiers.Kernel.Filesystem.Service)
			.toDynamicValue((context: interfaces.Context) =>
				context.container.get<FilesystemManager>(Identifiers.Kernel.Filesystem.Manager).driver(),
			);
	}
}
