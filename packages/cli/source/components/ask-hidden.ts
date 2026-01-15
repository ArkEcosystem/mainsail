import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { Application } from "../contracts.js";
import { Prompt } from "./prompt.js";

@injectable()
export class AskHidden {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Application;

	public async render(message: string, options: object = {}): Promise<string> {
		const { value } = await this.app.get<Prompt>(Identifiers.Cli.Component.Prompt).render({
			message,
			name: "value",
			type: "invisible",
			...options,
		});

		return value as string;
	}
}
