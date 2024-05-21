import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { existsSync, readdirSync } from "fs";

@injectable()
export class SnapshotService implements Contracts.State.SnapshotService {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	listSnapshots(): number[] {
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

	#getImportPath(): string {
		return this.app.dataPath("state-export");
	}
}
