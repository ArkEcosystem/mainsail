import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class IndexSet implements Contracts.State.IndexSet {
	#indexNames = new Set<string>();

	set(indexName: string) {
		this.#indexNames.add(indexName);
	}

	getAll(): string[] {
		return [...this.#indexNames.values()];
	}
}
