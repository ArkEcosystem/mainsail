import { Identifiers } from "@mainsail/constants";
import type { Container } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { assert } from "@mainsail/utils";

import { ActionFactory } from "./action-factory.js";
import {
	AbortErroredProcess,
	AbortMissingProcess,
	AbortRunningProcess,
	AbortStoppedProcess,
	AbortUnknownProcess,
	DaemonizeProcess,
	RestartProcess,
	RestartRunningProcess,
	RestartRunningProcessWithPrompt,
} from "./actions/index.js";
import { Application } from "./application.js";
import { ComponentFactory } from "./component-factory.js";
import {
	AppHeader,
	Ask,
	AskDate,
	AskHidden,
	AskNumber,
	AskPassword,
	AutoComplete,
	Box,
	Clear,
	Confirm,
	Error,
	Fatal,
	Info,
	Listing,
	Log,
	MultiSelect,
	NewLine,
	Prompt,
	Select,
	Spinner,
	Success,
	Table,
	TaskList,
	Title,
	Toggle,
	Warning,
} from "./components/index.js";
import { envPaths as environmentPaths } from "./env-paths.js";
import { Input, InputValidator } from "./input/index.js";
import { Output } from "./output/index.js";
import {
	Config,
	Environment,
	Installer,
	Logger,
	PluginManager,
	ProcessManager,
	Setup,
	Updater,
} from "./services/index.js";
import { Process } from "./utils/index.js";

export class ApplicationFactory {
	public static make(container: Container, package_: Contracts.Types.PackageJson): Application {
		const app: Application = new Application(container);

		// Package
		app.bind(Identifiers.Cli.Package).toConstantValue(package_);

		// Paths
		assert.string(package_.name);
		app.bind(Identifiers.Cli.Paths.Console).toConstantValue(environmentPaths.get(package_.name));

		const applicationName = package_.name?.split("/")[1];
		assert.string(applicationName);

		app.bind(Identifiers.Cli.Application.Name).toConstantValue(applicationName);

		// Factories
		app.bind(Identifiers.Cli.Action.Factory).to(ActionFactory).inSingletonScope();

		app.bind(Identifiers.Cli.Component.Factory).to(ComponentFactory).inSingletonScope();

		app.bind<(type: string) => Process>(Identifiers.Cli.ProcessFactory).toFactory(
			(context: Contracts.Kernel.Container.ResolutionContext) =>
				(type: string): Process => {
					const process: Process = container.get(Process, { autobind: true });
					process.initialize(type);

					return process;
				},
		);

		// Services
		app.bind(Identifiers.Cli.Service.Logger).to(Logger).inSingletonScope();
		app.bind(Identifiers.Cli.Service.Config).to(Config).inSingletonScope();
		app.bind(Identifiers.Cli.Service.Updater).to(Updater).inSingletonScope();
		app.bind(Identifiers.Cli.Service.ProcessManager).to(ProcessManager).inSingletonScope();
		app.bind(Identifiers.Cli.Service.PluginManager).to(PluginManager).inSingletonScope();
		app.bind(Identifiers.Cli.Service.Installer).to(Installer).inSingletonScope();
		app.bind(Identifiers.Cli.Service.Environment).to(Environment).inSingletonScope();
		app.bind(Identifiers.Cli.Service.Setup).to(Setup).inSingletonScope();

		// Output
		app.bind(Identifiers.Cli.Output.Instance).to(Output).inSingletonScope();

		// Input
		app.bind(Identifiers.Cli.Input.Instance).to(Input).inSingletonScope();
		app.bind(Identifiers.Cli.Input.Validator).to(InputValidator).inSingletonScope();

		// Actions
		app.bind(Identifiers.Cli.Action.AbortErroredProcess).to(AbortErroredProcess).inSingletonScope();
		app.bind(Identifiers.Cli.Action.AbortMissingProcess).to(AbortMissingProcess).inSingletonScope();
		app.bind(Identifiers.Cli.Action.AbortRunningProcess).to(AbortRunningProcess).inSingletonScope();
		app.bind(Identifiers.Cli.Action.AbortStoppedProcess).to(AbortStoppedProcess).inSingletonScope();
		app.bind(Identifiers.Cli.Action.AbortUnknownProcess).to(AbortUnknownProcess).inSingletonScope();
		app.bind(Identifiers.Cli.Action.DaemonizeProcess).to(DaemonizeProcess).inSingletonScope();
		app.bind(Identifiers.Cli.Action.RestartProcess).to(RestartProcess).inSingletonScope();
		app.bind(Identifiers.Cli.Action.RestartRunningProcess).to(RestartRunningProcess).inSingletonScope();
		app.bind(Identifiers.Cli.Action.RestartRunningProcessWithPrompt)
			.to(RestartRunningProcessWithPrompt)
			.inSingletonScope();

		// Components
		app.bind(Identifiers.Cli.Component.AppHeader).to(AppHeader).inSingletonScope();
		app.bind(Identifiers.Cli.Component.Ask).to(Ask).inSingletonScope();
		app.bind(Identifiers.Cli.Component.AskDate).to(AskDate).inSingletonScope();
		app.bind(Identifiers.Cli.Component.AskHidden).to(AskHidden).inSingletonScope();
		app.bind(Identifiers.Cli.Component.AskNumber).to(AskNumber).inSingletonScope();
		app.bind(Identifiers.Cli.Component.AskPassword).to(AskPassword).inSingletonScope();
		app.bind(Identifiers.Cli.Component.AutoComplete).to(AutoComplete).inSingletonScope();
		app.bind(Identifiers.Cli.Component.Box).to(Box).inSingletonScope();
		app.bind(Identifiers.Cli.Component.Clear).to(Clear).inSingletonScope();
		app.bind(Identifiers.Cli.Component.Confirm).to(Confirm).inSingletonScope();
		app.bind(Identifiers.Cli.Component.Error).to(Error).inSingletonScope();
		app.bind(Identifiers.Cli.Component.Fatal).to(Fatal).inSingletonScope();
		app.bind(Identifiers.Cli.Component.Info).to(Info).inSingletonScope();
		app.bind(Identifiers.Cli.Component.Listing).to(Listing).inSingletonScope();
		app.bind(Identifiers.Cli.Component.Log).to(Log).inSingletonScope();
		app.bind(Identifiers.Cli.Component.MultiSelect).to(MultiSelect).inSingletonScope();
		app.bind(Identifiers.Cli.Component.NewLine).to(NewLine).inSingletonScope();
		app.bind(Identifiers.Cli.Component.Prompt).to(Prompt).inSingletonScope();
		app.bind(Identifiers.Cli.Component.Select).to(Select).inSingletonScope();
		app.bind(Identifiers.Cli.Component.Spinner).to(Spinner).inSingletonScope();
		app.bind(Identifiers.Cli.Component.Success).to(Success).inSingletonScope();
		app.bind(Identifiers.Cli.Component.Table).to(Table).inSingletonScope();
		app.bind(Identifiers.Cli.Component.TaskList).to(TaskList).inSingletonScope();
		app.bind(Identifiers.Cli.Component.Title).to(Title).inSingletonScope();
		app.bind(Identifiers.Cli.Component.Toggle).to(Toggle).inSingletonScope();
		app.bind(Identifiers.Cli.Component.Warning).to(Warning).inSingletonScope();

		app.rebind(Identifiers.Cli.Paths.Application).toConstantValue(
			app.get<Environment>(Identifiers.Cli.Service.Environment).getPaths(),
		);

		return app;
	}
}
