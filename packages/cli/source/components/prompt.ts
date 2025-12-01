import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import prompts from "prompts";

export type { Choice } from "prompts";

@injectable()
export class Prompt {
	public async render(
		options: prompts.PromptObject<string> | prompts.PromptObject<string>[],
	): Promise<Contracts.Types.JsonObject> {
		return prompts(options);
	}
}
