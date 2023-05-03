import { Application, ApplicationFactory, Commands, Container as CLI, Services, Utils } from "@mainsail/core-cli";
import { Container } from "@mainsail/core-container";

export class Console {
	public app: Application;

	public pkg = {
		description: "Core of the ARK Blockchain",
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
			.rebind(CLI.Identifiers.ApplicationPaths)
			.toConstantValue(
				this.app
					.get<Services.Environment>(CLI.Identifiers.Environment)
					.getPaths(this.flags.token, this.flags.network),
			);

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
