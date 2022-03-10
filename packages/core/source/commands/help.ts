import { Commands, Container, Contracts } from "@arkecosystem/core-cli";
import boxen from "boxen";
import { blue, cyan } from "kleur";

@Container.injectable()
export class Command extends Commands.Command {
	public signature = "help";

	public description = "Displays detailed information on all commands available via CLI.";

	public requiresNetwork = false;

	public async execute(): Promise<void> {
		const commands: Contracts.CommandList = this.app.get(Container.Identifiers.Commands);

		// figure out the longest signature
		const signatures: string[] = Object.keys(commands);
		const longestSignature: number = signatures.reduce((a, b) => (a.length > b.length ? a : b)).length;

		// create groups
		const signatureGroups: Record<string, string[]> = {};
		for (const signature of signatures) {
			const groupName: string = signature.includes(":") ? signature.split(":")[0] : "default";

			if (!signatureGroups[groupName]) {
				signatureGroups[groupName] = [];
			}

			signatureGroups[groupName].push(signature);
		}

		// turn everything into a human readable format
		const commandsAsString: string[] = [];
		for (const [signatureGroup, signatures] of Object.entries(signatureGroups)) {
			commandsAsString.push(cyan().bold(signatureGroup));

			for (const signature of signatures) {
				commandsAsString.push(
					`  ${signature.padEnd(longestSignature, " ")}        ${commands[signature].description}`,
				);
			}
		}

		console.log(
			boxen(
				this.components.appHeader() +
					`

${blue().bold("Usage")}
  command [arguments] [flags]

${blue().bold("Flags")}
  --help              Display the corresponding help message.
  --quiet             Do not output any message

${blue().bold("Arguments")}
  -v|vv|vvv          Increase the verbosity of messages: 1 for normal output, 2 for more verbose output and 3 for debug

${blue().bold("Available Commands")}
${commandsAsString.join("\n")}`,
				{
					// @ts-ignore
					borderStyle: "classic",
					padding: 1,
				},
			),
		);
	}
}
