import { Application } from "../contracts";
import { Identifiers, inject, injectable } from "../ioc";
import { Prompt } from "./prompt";

@injectable()
export class Confirm {
	@inject(Identifiers.Application)
	private readonly app!: Application;

	public async render(message: string, options: object = {}): Promise<boolean> {
		const { value } = await this.app.get<Prompt>(Identifiers.Prompt).render({
			message,
			name: "value",
			type: "confirm",
			...options,
		});

		return value as boolean;
	}
}
