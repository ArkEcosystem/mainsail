import { injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers/index.js";
import { FilesystemManager } from "./manager.js";

@injectable()
export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind<FilesystemManager>(Identifiers.Services.Filesystem.Manager)
			.to(FilesystemManager)
			.inSingletonScope();

		await this.app.get<FilesystemManager>(Identifiers.Services.Filesystem.Manager).boot();

		this.app
			.bind(Identifiers.Services.Filesystem.Service)
			.toDynamicValue((context: Contracts.Kernel.Container.ResolutionContext) =>
				context.get<FilesystemManager>(Identifiers.Services.Filesystem.Manager).driver(),
			);
	}
}
