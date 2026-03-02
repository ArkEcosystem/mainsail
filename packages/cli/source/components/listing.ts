import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import type { Logger } from "../services/logger.js";

@injectable()
export class Listing {
	@inject(Identifiers.Cli.Service.Logger)
	private readonly logger!: Logger;

	public async render(elements: string[]): Promise<void> {
		for (const element of elements) {
			this.logger.log(` * ${element}`);
		}
	}
}
