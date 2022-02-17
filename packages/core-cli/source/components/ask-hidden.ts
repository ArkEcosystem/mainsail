import { Application } from "../contracts";
import { Identifiers, inject, injectable } from "../ioc";
import { Prompt } from "./prompt";

@injectable()
export class AskHidden {
	@inject(Identifiers.Application)
	private readonly app!: Application;

	public async render(message: string, opts: object = {}): Promise<string> {
		const { value } = await this.app.get<Prompt>(Identifiers.Prompt).render({
			message,
			name: "value",
			type: "invisible",
			...opts,
		});

		return value as string;
	}
}
