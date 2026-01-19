import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

import { Choice, Prompt } from "./prompt.js";

@injectable()
export class AutoComplete {
	@inject(Identifiers.Cli.Application.Instance)
	private readonly app!: Contracts.Cli.Application;

	public async render(message: string, choices: Choice[], options: object = {}): Promise<string> {
		const { value } = await this.app.get<Prompt>(Identifiers.Cli.Component.Prompt).render({
			choices,
			message,
			name: "value",
			type: "autocomplete",
			...options,
		});

		return value as string;
	}
}
