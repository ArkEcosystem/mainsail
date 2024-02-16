import { Application, ApplicationFactory, Commands, Identifiers, Services, Utils } from "@mainsail/cli";
import { Container } from "@mainsail/container";

export class Console {
	public app: Application;

	public pkg = {
		bin: {
			mainsail: "./bin/run",
		},
		description: "Core of the Mainsail Blockchain",
		name: "@mainsail/core",
		version: "3.0.0-next.0",
	};

	public args;

	public flags;

	#useDefaultFlags: boolean;

	public constructor(useDefaultFlags = true) {
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

	public async execute(command): Promise<void> {
		this.app
			.rebind(Identifiers.ApplicationPaths)
			.toConstantValue(this.app.get<Services.Environment>(Identifiers.Environment).getPaths());

		const cmd = this.app.resolve<Commands.Command>(command);

		const castedFlags = Utils.Flags.castFlagsToString(this.flags)
			.split("--")
			.filter(Boolean)
			.map((flag: string) => `--${flag}`.trim());

		cmd.register(this.args ? this.args.concat(castedFlags) : castedFlags);

		await cmd.run();

		this.#reset();
	}

	#reset(): void {
		this.args = [];
		this.flags = this.#useDefaultFlags ? { network: "testnet", token: "ark" } : {};
	}

	#createApplication(): Application {
		const app = ApplicationFactory.make(new Container(), this.pkg);

		this.flags = this.#useDefaultFlags ? { network: "testnet", token: "ark" } : {};

		return app;
	}
}
