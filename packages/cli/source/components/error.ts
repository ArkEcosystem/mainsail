import { inject, injectable } from "@mainsail/container";
import { bgRed, white } from "kleur/colors";

import { Identifiers } from "../ioc/index.js";
import type { Logger } from "../services/index.js";

@injectable()
export class Error {
	@inject(Identifiers.Logger)
	private readonly logger!: Logger;

	public render(message: string): void {
		this.logger.error(white(bgRed(`[ERROR] ${message}`)));
	}
}
