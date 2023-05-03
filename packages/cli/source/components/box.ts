import boxen from "boxen";

import { Identifiers, inject, injectable } from "../ioc";
import { Logger } from "../services";

@injectable()
export class Box {
	@inject(Identifiers.Logger)
	private readonly logger!: Logger;

	public render(message: string): void {
		// @ts-ignore
		this.logger.log(boxen(message, { borderStyle: "classic", margin: 1, padding: 1 }));
	}
}
