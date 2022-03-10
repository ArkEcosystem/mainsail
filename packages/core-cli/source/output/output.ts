import { injectable } from "../ioc";

enum OutputVerbosity {
	Quiet = 0,
	Normal = 1,
	Verbose = 2,
	Debug = 3,
}

@injectable()
export class Output {
	#verbosity: number = OutputVerbosity.Normal;

	#realStdout: Function = process.stdout.write;

	public mute() {
		// @ts-ignore - We don't care about the type error, we just want to noop it.
		process.stdout.write = () => {};
	}

	public unmute() {
		// @ts-ignore - We don't care about the type error, we just want to restore it.
		process.stdout.write = this.#realStdout;
	}

	public setVerbosity(level: number): void {
		this.#verbosity = level;
	}

	public getVerbosity(): number {
		return this.#verbosity;
	}

	public isQuiet(): boolean {
		return OutputVerbosity.Quiet === this.#verbosity;
	}

	public isNormal(): boolean {
		return OutputVerbosity.Normal === this.#verbosity;
	}

	public isVerbose(): boolean {
		return OutputVerbosity.Verbose <= this.#verbosity;
	}

	public isDebug(): boolean {
		return OutputVerbosity.Debug <= this.#verbosity;
	}
}
