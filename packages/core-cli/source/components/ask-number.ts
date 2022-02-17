import { Application } from "../contracts";
import { Identifiers, inject, injectable } from "../ioc";
import { Prompt } from "./prompt";

@injectable()
export class AskNumber {
	@inject(Identifiers.Application)
	private readonly app!: Application;

	public async render(message: string, opts: object = {}): Promise<number> {
		const { value } = await this.app.get<Prompt>(Identifiers.Prompt).render({
			message,
			name: "value",
			type: "number",
			...opts,
		});

		return value as number;
	}
}
