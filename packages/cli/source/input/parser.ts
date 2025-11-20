import yargs from "yargs-parser";

export class InputParser {
	public static parseArgv(arguments_: string[]): { args: (string | number)[]; flags: yargs.Arguments } {
		const parsed: yargs.Arguments = yargs(
			arguments_.filter((argument) => argument !== "--"),
			{ count: ["v"] },
		);

		const argv = parsed._;

		// @ts-ignore
		delete parsed._;

		return { args: argv, flags: parsed };
	}
}
