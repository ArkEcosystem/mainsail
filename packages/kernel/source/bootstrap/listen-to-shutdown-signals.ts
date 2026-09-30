import type { Contracts } from "@mainsail/contracts";

import { Enums, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

@injectable()
export class ListenToShutdownSignals implements Contracts.Kernel.Bootstrapper {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	public async bootstrap(): Promise<void> {
		for (const signal in Enums.Kernel.ShutdownSignal) {
			process.on(signal, () => {
				void this.#onSignal(signal);
			});
		}
	}

	async #onSignal(signal: string) {
		await this.app.terminate(signal);
	}
}
