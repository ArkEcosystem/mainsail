import { inject, injectable } from "@mainsail/container";

import { Application } from "../contracts";
import { Identifiers } from "../ioc";
import { Prompt } from "./prompt";

@injectable()
export class AskPassword {
	@inject(Identifiers.Application)
	private readonly app!: Application;

	public async render(message: string, options: object = {}): Promise<string> {
		const { value } = await this.app.get<Prompt>(Identifiers.Prompt).render({
			message,
			name: "value",
			type: "password",
			...options,
		});

		return value as string;
	}
}
