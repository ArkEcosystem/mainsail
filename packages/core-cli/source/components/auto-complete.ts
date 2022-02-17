import { Application } from "../contracts";
import { Identifiers, inject, injectable } from "../ioc";
import { Prompt } from "./prompt";

@injectable()
export class AutoComplete {
	@inject(Identifiers.Application)
	private readonly app!: Application;

	public async render(message: string, choices: any[], opts: object = {}): Promise<string> {
		const { value } = await this.app.get<Prompt>(Identifiers.Prompt).render({
			choices,
			message,
			name: "value",
			type: "autocomplete",
			...opts,
		});

		return value as string;
	}
}
