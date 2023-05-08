import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import prompts from "prompts";

@injectable()
export class Prompt {
	public async render(options: object): Promise<Contracts.Types.JsonObject> {
		return prompts(options);
	}
}
