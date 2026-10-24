import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";

// Forwards to the application logger while `logger.enabled` is set; otherwise drops everything.
@injectable()
export class Logger implements Contracts.Kernel.Logger {
	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p-websocket")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	public alert(message: string, context?: Contracts.Kernel.LoggerContext): void {
		if (this.#enabled()) {
			this.logger.alert(message, context);
		}
	}

	public error(message: string, context?: Contracts.Kernel.LoggerContext): void {
		if (this.#enabled()) {
			this.logger.error(message, context);
		}
	}

	public warn(message: string, context?: Contracts.Kernel.LoggerContext): void {
		if (this.#enabled()) {
			this.logger.warn(message, context);
		}
	}

	public notice(message: string, context?: Contracts.Kernel.LoggerContext): void {
		if (this.#enabled()) {
			this.logger.notice(message, context);
		}
	}

	public info(message: string, context?: Contracts.Kernel.LoggerContext): void {
		if (this.#enabled()) {
			this.logger.info(message, context);
		}
	}

	public debug(message: string, context?: Contracts.Kernel.LoggerContext): void {
		if (this.#enabled()) {
			this.logger.debug(message, context);
		}
	}

	public suppressConsoleOutput(): void {
		//
	}

	public async dispose(): Promise<void> {
		//
	}

	#enabled(): boolean {
		return this.configuration.getRequired<boolean>("logger.enabled");
	}
}
