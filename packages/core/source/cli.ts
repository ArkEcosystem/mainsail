import { ApplicationFactory, Commands, Contracts, Container, InputParser, Plugins } from "@arkecosystem/core-cli";
import envPaths from "env-paths";
import { existsSync } from "fs-extra";
import { platform } from "os";
import { join, resolve } from "path";
import { PackageJson } from "type-fest";

@Container.injectable()
export class CommandLineInterface {
	private app!: Contracts.Application;

	public constructor(private readonly argv: string[]) {}

	public async execute(dirname = __dirname): Promise<void> {
		// Set NODE_PATHS. Only required for plugins that uses @arkecosystem as peer dependencies.
		this.setNodePath();

		// Load the package information. Only needed for updates and installations.
		const package_: PackageJson = require("../package.json");

		// Create the application we will work with
		this.app = ApplicationFactory.make(new Container.Container(), package_);

		// Check for updates
		await this.app.get<Contracts.Updater>(Container.Identifiers.Updater).check();

		// Parse arguments and flags
		const { args, flags } = InputParser.parseArgv(this.argv);

		// Discover commands and commands from plugins
		const commands: Contracts.CommandList = await this.discoverCommands(dirname, flags);

		// Figure out what command we should run and offer help if necessary
		let commandSignature: string | undefined = args[0];

		if (!commandSignature) {
			await commands.help.execute();

			process.exitCode = 2;
			return;
		}

		let commandInstance: Commands.Command = commands[commandSignature];

		if (!commandInstance) {
			commandSignature = await this.app.resolve(Plugins.SuggestCommand).execute({
				bin: Object.keys(package_.bin)[0],
				signature: commandSignature,
				signatures: Object.keys(commands),
			});

			if (commandSignature) {
				commandInstance = commands[commandSignature];
			}
		}

		if (!commandInstance) {
			await commands.help.execute();

			process.exitCode = 2;
			return;
		}

		if (flags.help) {
			commandInstance.showHelp();

			return;
		}

		commandInstance.register(this.argv);

		await commandInstance.run();
	}

	private setNodePath(): void {
		const delimiter = platform() === "win32" ? ";" : ":";

		if (!process.env.NODE_PATH) {
			process.env.NODE_PATH = "";
		}

		const setPathIfExists = (path: string) => {
			if (existsSync(path)) {
				process.env.NODE_PATH += `${delimiter}${path}`;
			}
		};

		setPathIfExists(join(__dirname, "../../../"));
		setPathIfExists(join(__dirname, "../../../node_modules"));

		require("module").Module._initPaths();
	}

	private async detectNetworkAndToken(flags: any): Promise<{ token: string; network?: string }> {
		const temporaryFlags = {
			token: "ark",
			...flags,
		};

		if (temporaryFlags.token && temporaryFlags.network) {
			return temporaryFlags;
		}

		const config = await this.app.resolve(Commands.DiscoverConfig).discover(temporaryFlags.token);
		if (config) {
			return {
				network: config.network,
				token: config.token,
			};
		}

		try {
			temporaryFlags.network = await this.app.resolve(Commands.DiscoverNetwork).discover(
				envPaths(temporaryFlags.token, {
					suffix: "core",
				}).config,
			);
		} catch {}

		return temporaryFlags;
	}

	private async discoverCommands(dirname: string, flags: any): Promise<Contracts.CommandList> {
		const commandsDiscoverer = this.app.resolve(Commands.DiscoverCommands);
		const commands: Contracts.CommandList = commandsDiscoverer.within(resolve(dirname, "./commands"));

		const temporaryFlags = await this.detectNetworkAndToken(flags);

		if (temporaryFlags.network) {
			const plugins = await this.app
				.get<Contracts.PluginManager>(Container.Identifiers.PluginManager)
				.list(temporaryFlags.token, temporaryFlags.network);

			const commandsFromPlugins = commandsDiscoverer.from(plugins.map((plugin) => plugin.path));

			for (const [key, value] of Object.entries(commandsFromPlugins)) {
				commands[key] = value;
			}
		}

		this.app.bind(Container.Identifiers.Commands).toConstantValue(commands);
		return commands;
	}
}
