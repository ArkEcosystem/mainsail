import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { readdirSync } from "fs";
import { copy, ensureDir, pathExists, remove } from "fs-extra/esm";
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

	public async listSnapshots(): Promise<number[]> {
		const path = this.#getDataDir();
		if (!(await pathExists(path))) {
			return [];
		}

		// TODO: use filesystem
		const regexPattern = /^\d+\.gz$/;
		return readdirSync(path)
			.filter((item) => regexPattern.test(item))
			.map((item) => +item.split(".")[0])
			.sort((a, b) => b - a);
	}

	public async export(store: Contracts.State.Store): Promise<void> {
		const height = store.getLastHeight();

		let exported = false;

		try {
			this.logger.info(`Exporting state snapshot at height ${height}`);

			await ensureDir(this.#getTempDir());
			await this.exporter.export(store, this.#getTempPath(height));

			await ensureDir(this.#getDataDir());
			await copy(this.#getTempPath(height), this.#getDataPath(height));

			this.logger.info(`State snapshot exported at height ${height}`);
			exported = true;
		} catch (error) {
			this.logger.error(`Failed to export state snapshot at height ${height}: ${error.message}`);
		}

		if (exported) {
			await this.#removeOldSnapshots(height);
		} else {
			await this.#removeSnapshot(height);
		}
	}

	#getDataDir(): string {
		return this.app.dataPath("state-export");
	}

	#getDataPath(height: number): string {
		return join(this.#getDataDir(), `${height}.gz`);
	}

	#getTempDir(): string {
		return this.app.tempPath("state-export");
	}

	#getTempPath(height: number): string {
		return join(this.#getTempDir(), `${height}.gz`);
	}

	async #removeOldSnapshots(height: number): Promise<void> {
		const snapshots = await this.listSnapshots();
		const snapshotsToRemove = snapshots
			.filter((item) => item !== height)
			.slice(this.configuration.getRequired<number>("export.retainFiles") - 1);

		for (const height of snapshotsToRemove) {
			await this.#removeSnapshot(height);
		}
	}

	async #removeSnapshot(height: number): Promise<void> {
		try {
			await remove(this.#getDataPath(height));
		} catch {}
	}
}
