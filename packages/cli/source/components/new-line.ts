import { Identifiers, inject, injectable } from "../ioc";
import { Logger } from "../services";

@injectable()
export class NewLine {
	@inject(Identifiers.Logger)
	private readonly logger!: Logger;

	public render(count = 1): void {
		this.logger.log("\n".repeat(count));
	}
}
