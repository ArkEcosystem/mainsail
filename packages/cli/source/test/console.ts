import { Identifiers } from "@mainsail/constants";
import { Container } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

import { ApplicationFactory } from "../application-factory.js";
import { Flags } from "../utils/index.js";

// Class support for tests
export class Console {
	public app: Contracts.Cli.Application;

	public pkg = {
		bin: {
			mainsail: "./bin/run.js",
		},
		description: "Core of the Mainsail Blockchain",
		name: "@mainsail/core",
		version: "3.0.0-next.0",
	};

	public args;

	public flags;

	#useDefaultFlags: boolean;

	public constructor(useDefaultFlags: boolean = true) {
		this.#useDefaultFlags = useDefaultFlags;
		this.app = this.#createApplication();
	}

	public withArgs(arguments_: string[]): this {
		this.args = [""];
		this.args = this.args.concat(arguments_);

		return this;
	}

	public withFlags(flags: object): this {
		this.flags = { ...this.flags, ...flags };

		return this;
	}

	public async execute(command: Contracts.Kernel.Container.Newable<Contracts.Cli.Command>): Promise<void> {
		this.app
			.rebind(Identifiers.Cli.Paths.Application)
			.toConstantValue(this.app.get<Contracts.Cli.Environment>(Identifiers.Cli.Service.Environment).getPaths());

		const cmd = this.app.resolve<Contracts.Cli.Command>(command);

		const castedFlags = Flags.castFlagsToString(this.flags)
			.split("--")
			.filter(Boolean)
			.map((flag: string) => `--${flag}`.trim());

		cmd.register(this.args ? this.args.concat(castedFlags) : castedFlags);

		await cmd.run();

		this.#reset();
	}

	#reset(): void {
		this.args = [];
		this.flags = this.#useDefaultFlags ? { network: "devnet", token: "ark" } : {};
	}

	#createApplication(): Contracts.Cli.Application {
		const app = ApplicationFactory.make(new Container(), this.pkg);

		this.flags = this.#useDefaultFlags ? { network: "devnet", token: "ark" } : {};

		return app;
	}
}
