import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import prompts from "prompts";

@injectable()
export class Prompt {
	public async render(
		options: prompts.PromptObject<string> | prompts.PromptObject<string>[],
	): Promise<Contracts.Types.JsonObject> {
		return prompts(options);
	}
}
