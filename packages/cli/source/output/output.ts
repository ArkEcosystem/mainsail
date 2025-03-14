import { injectable } from "@mainsail/container";

enum OutputVerbosity {
	Quiet = 0,
	Normal = 1,
	Verbose = 2,
	Debug = 3,
}

@injectable()
export class Output {
	#verbosity: number = OutputVerbosity.Normal;

	#realStdout: (message: string) => boolean = process.stdout.write;

	public mute() {
		process.stdout.write = (message: string) => true;
	}

	public unmute() {
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
