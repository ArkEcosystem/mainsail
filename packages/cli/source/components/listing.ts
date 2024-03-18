import { inject, injectable } from "@mainsail/container";

import { Identifiers } from "../ioc/index.js";
import type { Logger } from "../services/index.js";

@injectable()
export class Listing {
	@inject(Identifiers.Logger)
	private readonly logger!: Logger;

	public async render(elements: string[]): Promise<void> {
		for (const element of elements) {
			this.logger.log(` * ${element}`);
		}
	}
}
