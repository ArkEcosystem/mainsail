import { Application, ApplicationFactory, Commands, Container, Services, Utils } from "@arkecosystem/core-cli";

export class Console {
	public app: Application;

	public pkg = {
		name: "@arkecosystem/core",
		description: "Core of the ARK Blockchain",
		version: "3.0.0-next.0",
	};

	public args;

	public flags;

	public constructor(private useDefaultFlags = true) {
		this.app = this.createApplication();
	}

	public withArgs(args: string[]): this {
		this.args = [""];
		this.args = this.args.concat(args);

		return this;
	}

	public withFlags(flags: object): this {
		this.flags = { ...this.flags, ...flags };

		return this;
	}

	public async execute(command): Promise<void> {
		this.app
			.rebind(Container.Identifiers.ApplicationPaths)
			.toConstantValue(
				this.app
					.get<Services.Environment>(Container.Identifiers.Environment)
					.getPaths(this.flags.token, this.flags.network),
			);

		const cmd = this.app.resolve<Commands.Command>(command);

		const castedFlags = Utils.castFlagsToString(this.flags)
			.split("--")
			.filter(Boolean)
			.map((flag: string) => `--${flag}`.trim());

		cmd.register(this.args ? this.args.concat(castedFlags) : castedFlags);

		await cmd.run();

		this.reset();
	}

	private reset(): void {
		this.args = [];
		this.flags = this.useDefaultFlags ? { token: "ark", network: "testnet" } : {};
	}

	private createApplication(): Application {
		const app = ApplicationFactory.make(new Container.Container(), this.pkg);

		this.flags = this.useDefaultFlags ? { token: "ark", network: "testnet" } : {};

		return app;
	}
}
