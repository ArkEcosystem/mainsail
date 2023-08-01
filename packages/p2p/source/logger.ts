import { inject, injectable } from "@mainsail/container";
import { Constants, Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Logger implements Contracts.P2P.Logger {
	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	emergency(message: any): void {
		this.logger.emergency(message);
	}

	alert(message: any): void {
		this.logger.alert(message);
	}

	critical(message: any): void {
		this.logger.critical(message);
	}

	error(message: any): void {
		this.logger.error(message);
	}

	warning(message: any): void {
		this.logger.warning(message);
	}

	warningExtra(message: any): void {
		if (this.#allowExtra()) {
			this.logger.warning(message);
		}
	}

	notice(message: any): void {
		this.logger.notice(message);
	}

	info(message: any): void {
		this.logger.info(message);
	}

	debug(message: any): void {
		this.logger.debug(message);
	}

	debugExtra(message: any): void {
		if (this.#allowExtra()) {
			this.logger.debug(message);
		}
	}

	#allowExtra(): boolean {
		return process.env[Constants.Flags.CORE_P2P_PEER_VERIFIER_DEBUG_EXTRA] === "true";
	}
}
