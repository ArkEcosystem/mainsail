import { Identifiers, inject, injectable } from "../ioc";
import { Logger } from "../services";

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
