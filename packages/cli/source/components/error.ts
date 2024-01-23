import { inject, injectable } from "@mainsail/container";
import { white } from "kleur";

import { Identifiers } from "../ioc";
import type { Logger } from "../services";

@injectable()
export class Error {
	@inject(Identifiers.Logger)
	private readonly logger!: Logger;

	public render(message: string): void {
		this.logger.error(white().bgRed(`[ERROR] ${message}`));
	}
}
