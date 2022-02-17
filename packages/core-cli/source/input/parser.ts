import yargs from "yargs-parser";

export class InputParser {
	public static parseArgv(args: string[]) {
		const parsed: yargs.Arguments = yargs(args, { count: ["v"] });

		const argv: string[] = parsed._;

		// @ts-ignore
		delete parsed._;

		return { args: argv, flags: parsed };
	}
}
