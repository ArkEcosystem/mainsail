import { inject, injectable } from "@mainsail/container";
import { Constants, Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Logger implements Contracts.P2P.Logger {
	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	emergency(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.logger.emergency(message, context);
	}

	alert(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.logger.alert(message, context);
	}

	fatal(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.logger.fatal(message, context);
	}

	error(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.logger.error(message, context);
	}

	warn(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.logger.warn(message, context);
	}

	warningExtra(message: string, context?: Contracts.Kernel.LoggerContext): void {
		if (this.#allowExtra()) {
			this.logger.warn(message, context);
		}
	}

	notice(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.logger.notice(message, context);
	}

	info(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.logger.info(message, context);
	}

	debug(message: string, context?: Contracts.Kernel.LoggerContext): void {
		this.logger.debug(message, context);
	}

	debugExtra(message: string, context?: Contracts.Kernel.LoggerContext): void {
		if (this.#allowExtra()) {
			this.logger.debug(message, context);
		}
	}

	#allowExtra(): boolean {
		return process.env[Constants.EnvironmentVariables.MAINSAIL_P2P_PEER_LOG_EXTRA] === "true";
	}
}
