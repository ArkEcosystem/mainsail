import { inject, injectable } from "@mainsail/container";
import boxen from "boxen";

import { Identifiers } from "../ioc/index.js";
import type { Logger } from "../services/index.js";

@injectable()
export class Box {
	@inject(Identifiers.Logger)
	private readonly logger!: Logger;

	public render(message: string): void {
		// @ts-ignore
		this.logger.log(boxen(message, { borderStyle: "classic", margin: 1, padding: 1 }));
	}
}
