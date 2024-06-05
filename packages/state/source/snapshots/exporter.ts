import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { createWriteStream } from "fs";
import Pumpify from "pumpify";
import { Writable } from "stream";
import { createGzip } from "zlib";

// Exported file format:
// - fileVersion
// - appVersion
// - store as JSON
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
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.State.WalletRepository.IndexSet)
	protected readonly indexSet!: Contracts.State.IndexSet;

	async export(store: Contracts.State.Store, path: string): Promise<void> {
		return new Promise(async (resolve, reject) => {
			const writeStream = createWriteStream(path);
			const exportStream = new Pumpify(createGzip(), writeStream);

			await this.#exportVersion(exportStream);
			await this.#exportStore(exportStream, store);
			await this.#exportWallets(exportStream, store.walletRepository);
			await this.#exportIndexes(exportStream, store.walletRepository);

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

	async #exportStore(stream: Writable, store: Contracts.State.Store): Promise<void> {
		stream.write(`${JSON.stringify(store.toJson())}\n`);
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
}
