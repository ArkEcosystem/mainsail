import { inject, injectable } from "@mainsail/container";
import { bgGreen, white } from "kleur/colors";

import { Identifiers } from "../ioc/index.js";
import type { Logger } from "../services/index.js";

@injectable()
export class Success {
	@inject(Identifiers.Logger)
	private readonly logger!: Logger;

	public render(message: string): void {
		this.logger.info(white(bgGreen(`[OK] ${message}`)));
	}
}
