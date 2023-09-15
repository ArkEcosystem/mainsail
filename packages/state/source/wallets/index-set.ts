import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class IndexSet implements Contracts.State.IndexSet {
	#indexNames = new Set<string>();

	set(indexName: string) {
		if (this.#indexNames.has(indexName)) {
			throw new Error(`The wallet index ${indexName} is already registered`);
		}
		this.#indexNames.add(indexName);
	}

	all(): string[] {
		return [...this.#indexNames.values()];
	}
}
