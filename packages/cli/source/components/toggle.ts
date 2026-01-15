import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { Application } from "../contracts.js";
import { Prompt } from "./prompt.js";

@injectable()
export class Toggle {
	@inject(Identifiers.Cli.Application.Instance)
	private readonly app!: Application;

	public async render(message: string, options: object = {}): Promise<boolean> {
		const { value } = await this.app.get<Prompt>(Identifiers.Cli.Component.Prompt).render({
			message,
			name: "value",
			type: "toggle",
			...options,
		});

		return value as boolean;
	}
}
