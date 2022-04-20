import yargs from "yargs-parser";

export class InputParser {
	public static parseArgv(arguments_: string[]) {
		const parsed: yargs.Arguments = yargs(arguments_, { count: ["v"] });

		const argv: string[] = parsed._;

		// @ts-ignore
		delete parsed._;

		return { args: argv, flags: parsed };
	}
}
