import { inject, injectable } from "@mainsail/container";
import { minBy } from "@mainsail/utils";
import Levenshtein from "fast-levenshtein";
import { blue, red } from "kleur";
import { JsonObject } from "type-fest";

import { Application } from "../application";
import { Identifiers } from "../ioc";

@injectable()
export class SuggestCommand {
	@inject(Identifiers.Application)
	private readonly app!: Application;

	public async execute(context: JsonObject): Promise<string | undefined> {
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

		this.app.get<any>(Identifiers.Info).render(`Run ${blue("ark help")} for a list of available commands.`);

		return undefined;
	}
}
