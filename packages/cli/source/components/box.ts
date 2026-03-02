import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import boxen from "boxen";

import type { Logger } from "../services/logger.js";

@injectable()
export class Box {
	@inject(Identifiers.Cli.Service.Logger)
	private readonly logger!: Logger;

	public render(message: string): void {
		this.logger.log(boxen(message, { borderStyle: "classic", margin: 1, padding: 1 }));
	}
}
