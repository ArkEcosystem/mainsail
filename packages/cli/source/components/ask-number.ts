import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

import { Prompt } from "./prompt.js";

@injectable()
export class AskNumber {
	@inject(Identifiers.Cli.Application.Instance)
	private readonly app!: Contracts.Cli.Application;

	public async render(message: string, options: object = {}): Promise<number> {
		const { value } = await this.app.get<Prompt>(Identifiers.Cli.Component.Prompt).render({
			message,
			name: "value",
			type: "number",
			...options,
		});

		return value as number;
	}
}
