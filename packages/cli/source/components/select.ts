import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { Application } from "../contracts.js";
import { Choice, Prompt } from "./prompt.js";

@injectable()
export class Select {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Application;

	public async render(message: string, choices: Choice[], options: object = {}): Promise<string> {
		const { value } = await this.app.get<Prompt>(Identifiers.Cli.Component.Prompt).render({
			choices,
			message,
			name: "value",
			type: "toggle",
			...options,
		});

		return value as string;
	}
}
