import { interfaces } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers/index.js";
import { FilesystemManager } from "./manager.js";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind<FilesystemManager>(Identifiers.Services.Filesystem.Manager)
			.to(FilesystemManager)
			.inSingletonScope();

		await this.app.get<FilesystemManager>(Identifiers.Services.Filesystem.Manager).boot();

		this.app
			.bind(Identifiers.Services.Filesystem.Service)
			.toDynamicValue((context: interfaces.Context) =>
				context.container.get<FilesystemManager>(Identifiers.Services.Filesystem.Manager).driver(),
			);
	}
}
