import { Identifiers, inject, injectable } from "../ioc";
import { Logger } from "../services";

@injectable()
export class Log {
	@inject(Identifiers.Logger)
	private readonly logger!: Logger;

	public render(message: string): void {
		this.logger.log(message);
	}
}
