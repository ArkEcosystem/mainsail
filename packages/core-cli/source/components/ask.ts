import { Application } from "../contracts";
import { Identifiers, inject, injectable } from "../ioc";
import { Prompt } from "./prompt";

@injectable()
export class Ask {
	@inject(Identifiers.Application)
	private readonly app!: Application;

	public async render(message: string, opts: object = {}): Promise<string> {
		const { value } = await this.app.get<Prompt>(Identifiers.Prompt).render({
			message,
			name: "value",
			type: "text",
			...opts,
		});

		return value as string;
	}
}
