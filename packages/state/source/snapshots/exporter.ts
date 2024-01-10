import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { copyFile, createWriteStream, ensureDirSync, readdirSync, remove } from "fs-extra";
import { join } from "path";
import Pumpify from "pumpify";
import { Writable } from "stream";
import { createGzip } from "zlib";

// Exported file format:
// - fileVersion
// - appVersion
// - StateStore as JSON
// - Each wallet as JSON
// - Each index as key-wallet address pair

class Iterator {
	#iteration = 0;

	async next(): Promise<void> {
		if (this.#iteration % 1000 === 0) {
			await new Promise((resolve) => setTimeout(resolve, 0));
		}
		this.#iteration++;
	}
}

@injectable()
export class Exporter implements Contracts.State.Exporter {
	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "state")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.WalletRepositoryIndexSet)
	protected readonly indexSet!: Contracts.State.IndexSet;

	@inject(Identifiers.Kernel.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	public async export(
		stateStore: Contracts.State.StateStore,
		walletRepository: Contracts.State.WalletRepository,
	): Promise<void> {
		const height = stateStore.getLastHeight();

		ensureDirSync(this.app.tempPath("state-export"));
		const temporaryPath = this.app.tempPath(join("state-export", `${height}.gz`));

		this.logger.info(`Exporting state at height ${height}`);

		await this.#export(temporaryPath, stateStore, walletRepository);

		ensureDirSync(this.app.dataPath("state-export"));
		await copyFile(temporaryPath, this.app.dataPath(join("state-export", `${height}.gz`)));

		await this.#removeExcessFiles(height);

		this.logger.info(`State export done for height ${height}`);
	}

	async #export(
		temporaryPath: string,
		stateStore: Contracts.State.StateStore,
		walletRepository: Contracts.State.WalletRepository,
	): Promise<void> {
		return new Promise(async (resolve, reject) => {
			const writeStream = createWriteStream(temporaryPath);
			const exportStream = new Pumpify(createGzip(), writeStream);

			await this.#exportVersion(exportStream);
			await this.#exportStateStore(exportStream, stateStore);
			await this.#exportWallets(exportStream, walletRepository);
			await this.#exportIndexes(exportStream, walletRepository);

			exportStream.end();

			exportStream.once("finish", () => {
				resolve();
			});

			exportStream.once("error", (error) => {
				writeStream.destroy();
				reject(error);
			});
		});
	}

	async #exportVersion(stream: Writable): Promise<void> {
		stream.write(`${1}\n`); // File version
		stream.write(`${this.app.version()}\n`);
		stream.write("\n");
	}

	async #exportStateStore(stream: Writable, stateStore: Contracts.State.StateStore): Promise<void> {
		stream.write(`${JSON.stringify(stateStore.toJson())}\n`);
		stream.write("\n");
	}

	async #exportWallets(stream: Writable, walletRepository: Contracts.State.WalletRepository): Promise<void> {
		const iterator = new Iterator();
		for (const wallet of walletRepository.allByAddress()) {
			stream.write(`${JSON.stringify(wallet.toJson())}\n`);
			await iterator.next();
		}
		stream.write("\n");
	}

	async #exportIndexes(stream: Writable, walletRepository: Contracts.State.WalletRepository): Promise<void> {
		for (const indexName of this.indexSet.all()) {
			const index = walletRepository.getIndex(indexName);
			if (index.size() === 0) {
				continue;
			}

			await this.#exportIndex(stream, indexName, index);
		}
	}

	async #exportIndex(stream: Writable, indexName: string, index: Contracts.State.WalletIndex): Promise<void> {
		stream.write(`${indexName}\n`);

		const iterator = new Iterator();
		for (const [key, wallet] of index.entries()) {
			stream.write(`${key}:${wallet.getAddress()}\n`);
			await iterator.next();
		}
		stream.write("\n");
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
