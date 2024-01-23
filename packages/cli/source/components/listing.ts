import { inject, injectable } from "@mainsail/container";

import { Identifiers } from "../ioc";
import type { Logger } from "../services";

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
