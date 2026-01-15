import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { blue, bold } from "kleur/colors";

import { AppHeader } from "../components/index.js";
import { Application, InputArguments } from "../contracts.js";

interface CommandInterface {
	readonly signature: string;
	readonly description: string | undefined;
	readonly isHidden: boolean;

	readonly definition: {
		getArguments(): InputArguments;
		getFlags(): InputArguments;
	};
}

@injectable()
export class CommandHelp {
	@inject(Identifiers.Cli.Application.Instance)
	protected readonly app!: Application;

	@inject(Identifiers.Cli.Package)
	protected readonly pkg!: Contracts.Types.PackageJson;

	public render(command: CommandInterface): string {
		let helpMessage = `${this.app.get<AppHeader>(Identifiers.Cli.Component.AppHeader).render()}

${blue(bold("Description"))}
${command.description}`;

		const arguments_: string = this.#buildArguments(command);

		if (arguments_) {
			helpMessage += `${blue(bold("\n\nArguments"))}
${arguments_}`;
		}

		const flags: string = this.#buildFlags(command);

		if (flags) {
			helpMessage += `${blue(bold("\n\nFlags"))}
${flags}`;
		}

		return helpMessage;
	}

	#buildArguments(command: CommandInterface): string {
		const arguments_ = command.definition.getArguments();

		if (Object.keys(arguments_).length <= 0) {
			return "";
		}

		const { options, descriptions, longestProperty } = this.#buildProperties(arguments_);

		const output: string[] = [];
		for (const [index, option] of options.entries()) {
			output.push(`${option.padEnd(longestProperty, " ")}    ${descriptions[index]}`);
		}

		return output.join("\n");
	}

	#buildFlags(command: CommandInterface): string {
		const flags = command.definition.getFlags();

		if (Object.keys(flags).length <= 0) {
			return "";
		}

		const { options, descriptions, longestProperty } = this.#buildProperties(flags);

		const output: string[] = [];
		for (const [index, option] of options.entries()) {
			output.push(`--${option.padEnd(longestProperty, " ")}    ${descriptions[index]}`);
		}

		return output.join("\n");
	}

	#buildProperties<T extends Record<string, unknown>>(properties: T) {
		const options: string[] = [];
		const descriptions: string[] = [];

		for (const option of Object.keys(properties)) {
			options.push(option);
			descriptions.push((properties[option] as { description: string }).description);
		}

		return {
			descriptions,
			longestProperty: options.reduce((a, b) => (a.length > b.length ? a : b)).length,
			options,
		};
	}
}
