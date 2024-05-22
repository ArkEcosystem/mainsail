import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { existsSync, readdirSync } from "fs";
import { copy, ensureDirSync, remove } from "fs-extra/esm";
import { join } from "path";

@injectable()
export class SnapshotService implements Contracts.State.SnapshotService {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "state")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.State.Snapshot.Exporter)
	private readonly exporter!: Contracts.State.Exporter;

	public listSnapshots(): number[] {
		const path = this.#getImportPath();
		if (!existsSync(path)) {
			return [];
		}

		const regexPattern = /^\d+\.gz$/;
		return readdirSync(path)
			.filter((item) => regexPattern.test(item))
			.map((item) => +item.split(".")[0])
			.sort((a, b) => b - a);
	}

	public async export(store: Contracts.State.Store): Promise<void> {
		const height = store.getLastHeight();

		this.logger.info(`Exporting state snapshot at height ${height}`);

		ensureDirSync(this.app.tempPath("state-export"));
		const temporaryPath = this.app.tempPath(join("state-export", `${height}.gz`));

		await this.exporter.export(store, temporaryPath);

		ensureDirSync(this.app.dataPath("state-export"));
		await copy(temporaryPath, this.app.dataPath(join("state-export", `${height}.gz`)));

		await this.#removeExcessFiles(height);

		this.logger.info(`State snapshot exported at height ${height}`);
	}

	#getImportPath(): string {
		return this.app.dataPath("state-export");
	}

	async #removeExcessFiles(height: number): Promise<void> {
		const regexPattern = /^\d+\.gz$/;
		const heights = readdirSync(this.app.dataPath("state-export"))
			.filter((item) => regexPattern.test(item))
			.map((item) => +item.split(".")[0])
			.filter((item) => item !== height)
			.sort((a, b) => b - a);

		for (const height of heights.slice(this.configuration.getRequired<number>("export.retainFiles") - 1)) {
			await remove(this.app.dataPath(join("state-export", `${height}.gz`)));
		}
	}
}
