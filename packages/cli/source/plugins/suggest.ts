import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { minBy } from "@mainsail/utils";
import Levenshtein from "fast-levenshtein";
import { blue, red } from "kleur";

import { Application } from "../application";
import { Identifiers } from "../ioc";

@injectable()
export class SuggestCommand {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Application;

	public async execute(context: Contracts.Types.JsonObject): Promise<string | undefined> {
		const signature: string = context.signature as string;

		if (!signature) {
			return undefined;
		}

		const signatures: string[] = context.signatures as string[];

		if (!Array.isArray(signatures) || signatures.length === 0) {
			return undefined;
		}

		const suggestion: string = minBy(signatures, (c) => Levenshtein.get(signature, c));

		this.app.get<any>(Identifiers.Warning).render(`${red(signature)} is not a ${context.bin} command.`);

		if (
			await this.app
				.get<any>(Identifiers.Confirm)
				.render(`Did you intend to use the command ${blue(suggestion)}?`)
		) {
			this.app.get<any>(Identifiers.Clear).render();

			return suggestion;
		}

		this.app.get<any>(Identifiers.Info).render(`Run ${blue("mainsail help")} for a list of available commands.`);

		return undefined;
	}
}
