import { Identifiers as ID } from "@arkecosystem/core-contracts";

export const Identifiers = {
	// Actions
	AbortMissingProcess: Symbol.for("Action<AbortMissingProcess>"),

	AbortErroredProcess: Symbol.for("Action<AbortErroredProcess>"),

	// Factories
	ActionFactory: Symbol.for("Factory<Action>"),

	AbortRunningProcess: Symbol.for("Action<AbortRunningProcess>"),

	// @TODO
	Application: ID.Application,

	AbortStoppedProcess: Symbol.for("Action<AbortStoppedProcess>"),

	ApplicationPaths: Symbol.for("Paths<Application>"),

	AbortUnknownProcess: Symbol.for("Action<AbortUnknownProcess>"),

	Commands: Symbol.for("Commands"),

	// Components
	AppHeader: Symbol.for("Component<AppHeader>"),

	ComponentFactory: Symbol.for("Factory<Component>"),

	Ask: Symbol.for("Component<Ask>"),

	Config: Symbol.for("Config"),

	AskDate: Symbol.for("Component<AskDate>"),

	ConsolePaths: Symbol.for("Paths<Console>"),

	AskHidden: Symbol.for("Component<AskHidden>"),

	Environment: Symbol.for("Environment"),

	AskNumber: Symbol.for("Component<AskNumber>"),

	Input: Symbol.for("Input"),

	AskPassword: Symbol.for("Component<AskPassword>"),

	// Input
	InputValidator: Symbol.for("Input<Validator>"),
	AutoComplete: Symbol.for("Component<AutoComplete>"),
	Installer: Symbol.for("Installer"),
	Box: Symbol.for("Component<Box>"),
	Logger: Symbol.for("Logger"),
	Clear: Symbol.for("Component<Clear>"),
	Output: Symbol.for("Output"),
	Confirm: Symbol.for("Component<Confirm>"),
	Package: Symbol.for("Package"),
	DaemonizeProcess: Symbol.for("Action<DaemonizeProcess>"),
	PluginManager: Symbol.for("PluginManager"),
	Error: Symbol.for("Component<Error>"),
	ProcessManager: Symbol.for("ProcessManager"),
	Fatal: Symbol.for("Component<Fatal>"),
	Updater: Symbol.for("Updater"),
	Info: Symbol.for("Component<Info>"),
	InputFactory: Symbol.for("Factory<Input>"),
	Listing: Symbol.for("Component<Listing>"),
	Log: Symbol.for("Component<Log>"),
	ProcessFactory: Symbol.for("Factory<Process>"),
	MultiSelect: Symbol.for("Component<MultiSelect>"),
	NewLine: Symbol.for("Component<NewLine>"),
	Prompt: Symbol.for("Component<Prompt>"),
	RestartProcess: Symbol.for("Action<RestartProcess>"),
	RestartRunningProcess: Symbol.for("Action<RestartRunningProcess>"),
	RestartRunningProcessWithPrompt: Symbol.for("Action<RestartRunningProcessWithPrompt>"),
	Select: Symbol.for("Component<Select>"),
	Spinner: Symbol.for("Component<Spinner>"),
	Success: Symbol.for("Component<Success>"),
	Table: Symbol.for("Component<Table>"),
	TaskList: Symbol.for("Component<TaskList>"),
	Title: Symbol.for("Component<Title>"),
	Toggle: Symbol.for("Component<Toggle>"),
	Warning: Symbol.for("Component<Warning>"),
};
