import { injectable } from "@mainsail/container";
import prompts from "prompts";
import { JsonObject } from "type-fest";

@injectable()
export class Prompt {
	public async render(options: object): Promise<JsonObject> {
		return prompts(options);
	}
}
