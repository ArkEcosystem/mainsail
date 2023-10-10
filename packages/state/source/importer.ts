import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { createReadStream, readdirSync } from "fs-extra";
import { join } from "path";
import readline, { Interface } from "readline";

@injectable()
export class Importer {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	async import(
		maxHeight: number,
		stateStore: Contracts.State.StateStore,
		walletRepository: Contracts.State.WalletRepository,
	): Promise<void> {
		// ...
		const fileName = await this.#findImportFile(maxHeight);
		if (!fileName) {
			this.logger.info("No state snapshot found to import");
			return;
		}

		this.logger.info(`Importing state snapshot: ${fileName}`);

		await this.#readFile(fileName, stateStore, walletRepository);
	}

	async #findImportFile(maxHeigh: number): Promise<string | undefined> {
		const regexPattern = /^\d+\.zip$/;
		const heights = readdirSync(this.app.dataPath("state-export"))
			.filter((item) => regexPattern.test(item))
			.map((item) => +item.split(".")[0])
			.filter((item) => item <= maxHeigh)
			.sort((a, b) => b - a);

		if (heights.length > 0) {
			return `${heights[0]}.zip`;
		}
		return undefined;
	}

	async #readFile(
		fileName: string,
		stateStore: Contracts.State.StateStore,
		walletRepository: Contracts.State.WalletRepository,
	): Promise<void> {
		const stream = createReadStream(this.app.dataPath(join("state-export", fileName)));
		const reader = readline.createInterface({
			crlfDelay: Number.POSITIVE_INFINITY,
			input: stream,
		});

		await this.#readVersion(reader);
		await this.#readState(reader, stateStore);

		// for await (const line of reader) {
		// 	// Each line in input.txt will be successively available here as `line`.
		// 	console.log(`Line from file: ${line}`);
		// }
	}

	async #readVersion(reader: Interface): Promise<void> {
		const version = (await reader[Symbol.asyncIterator]().next()).value;
		if (version !== "1") {
			throw new Error(`Invalid snapshot version: ${version}`);
		}

		await reader[Symbol.asyncIterator]().next(); // App version
		await reader[Symbol.asyncIterator]().next(); // Empty Line
	}

	async #readState(reader: Interface, stateStore: Contracts.State.StateStore): Promise<void> {
		const state = (await reader[Symbol.asyncIterator]().next()).value; // State height
		await reader[Symbol.asyncIterator]().next(); // Empty Line

		stateStore.fromJson(JSON.parse(state));
	}
}
