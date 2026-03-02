import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { minBy } from "@mainsail/utils";
import Levenshtein from "fast-levenshtein";
import { blue, red } from "kleur/colors";

import { Application } from "../application.js";
import { Clear } from "../components/clear.js";
import { Confirm } from "../components/confirm.js";
import { Info } from "../components/info.js";
import { Warning } from "../components/warning.js";

@injectable()
export class SuggestCommand {
	@inject(Identifiers.Cli.Application.Instance)
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

		this.app
			.get<Warning>(Identifiers.Cli.Component.Warning)
			.render(`${red(signature)} is not a ${context.bin} command.`);

		if (
			await this.app
				.get<Confirm>(Identifiers.Cli.Component.Confirm)
				.render(`Did you intend to use the command ${blue(suggestion)}?`)
		) {
			this.app.get<Clear>(Identifiers.Cli.Component.Clear).render();

			return suggestion;
		}

		this.app
			.get<Info>(Identifiers.Cli.Component.Info)
			.render(`Run ${blue("mainsail help")} for a list of available commands.`);

		return undefined;
	}
}
