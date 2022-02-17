import { Application } from "../contracts";
import { Identifiers, inject, injectable } from "../ioc";
import { Prompt } from "./prompt";

@injectable()
export class Select {
	@inject(Identifiers.Application)
	private readonly app!: Application;

	public async render(message: string, choices: any[], opts: object = {}): Promise<string> {
		const { value } = await this.app.get<Prompt>(Identifiers.Prompt).render({
			...{
				type: "toggle",
				name: "value",
				message,
				choices,
			},
			...opts,
		});

		return value as string;
	}
}
