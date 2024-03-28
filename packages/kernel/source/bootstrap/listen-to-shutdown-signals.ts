import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { ShutdownSignal } from "../enums/index.js";

@injectable()
export class ListenToShutdownSignals implements Contracts.Kernel.Bootstrapper {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	public async bootstrap(): Promise<void> {
		for (const signal in ShutdownSignal) {
			process.on(signal as any, async (code) => {
				await this.app.terminate(signal);
			});
		}
	}
}
