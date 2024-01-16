import { inject, injectable } from "@mainsail/container";

import { Application } from "../contracts";
import { Identifiers } from "../ioc";
import { Prompt } from "./prompt";

@injectable()
export class Confirm {
	@inject(Identifiers.Application.Instance)
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
