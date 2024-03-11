import { inject, injectable } from "@mainsail/container";
import { white } from "kleur";

import { Runtime } from "../exceptions/index.js";
import { Identifiers } from "../ioc/index.js";
import type { Logger } from "../services/index.js";

@injectable()
export class Fatal {
	@inject(Identifiers.Logger)
	private readonly logger!: Logger;

	public render(message: string): void {
		this.logger.error(white().bgRed(`[ERROR] ${message}`));

		throw new Runtime.FatalException(message);
	}
}
