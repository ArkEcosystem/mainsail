import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import type Table3 from "cli-table3";
import { Options, Ora } from "ora";
import { Choice, PromptObject } from "prompts";

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
	Task,
	TaskList,
	Title,
	Toggle,
	Warning,
} from "./components/index.js";
import { Application } from "./contracts.js";

@injectable()
export class ComponentFactory {
	@inject(Identifiers.Cli.Application.Instance)
	protected readonly app!: Application;

	public appHeader(): string {
		return this.app.get<AppHeader>(Identifiers.Cli.Component.AppHeader).render();
	}

	public async askDate(message: string, options: object = {}): Promise<string> {
		return this.app.get<AskDate>(Identifiers.Cli.Component.AskDate).render(message, options);
	}

	public async askHidden(message: string, options: object = {}): Promise<string> {
		return this.app.get<AskHidden>(Identifiers.Cli.Component.AskHidden).render(message, options);
	}

	public async askNumber(message: string, options: object = {}): Promise<number> {
		return this.app.get<AskNumber>(Identifiers.Cli.Component.AskNumber).render(message, options);
	}

	public async askPassword(message: string, options: object = {}): Promise<string> {
		return this.app.get<AskPassword>(Identifiers.Cli.Component.AskPassword).render(message, options);
	}

	public async ask(message: string, options: object = {}): Promise<string> {
		return this.app.get<Ask>(Identifiers.Cli.Component.Ask).render(message, options);
	}

	public async autoComplete(message: string, choices: Choice[], options: object = {}): Promise<string> {
		return this.app.get<AutoComplete>(Identifiers.Cli.Component.AutoComplete).render(message, choices, options);
	}

	public box(message: string): void {
		return this.app.get<Box>(Identifiers.Cli.Component.Box).render(message);
	}

	public clear(): void {
		return this.app.get<Clear>(Identifiers.Cli.Component.Clear).render();
	}

	public async confirm(message: string, options: object = {}): Promise<boolean> {
		return this.app.get<Confirm>(Identifiers.Cli.Component.Confirm).render(message, options);
	}

	public error(message: string): void {
		return this.app.get<Error>(Identifiers.Cli.Component.Error).render(message);
	}

	public fatal(message: string): void {
		return this.app.get<Fatal>(Identifiers.Cli.Component.Fatal).render(message);
	}

	public info(message: string): void {
		return this.app.get<Info>(Identifiers.Cli.Component.Info).render(message);
	}

	public async listing(elements: string[]): Promise<void> {
		return this.app.get<Listing>(Identifiers.Cli.Component.Listing).render(elements);
	}

	public log(message: string): void {
		return this.app.get<Log>(Identifiers.Cli.Component.Log).render(message);
	}

	public async multiSelect(message: string, choices: Choice[], options: object = {}): Promise<string[]> {
		return this.app.get<MultiSelect>(Identifiers.Cli.Component.MultiSelect).render(message, choices, options);
	}

	public newLine(count: number = 1): void {
		return this.app.get<NewLine>(Identifiers.Cli.Component.NewLine).render(count);
	}

	public async prompt(options: PromptObject<string> | PromptObject<string>[]): Promise<Contracts.Types.JsonObject> {
		return this.app.get<Prompt>(Identifiers.Cli.Component.Prompt).render(options);
	}

	public async select(message: string, choices: Choice[], options: object = {}): Promise<string> {
		return this.app.get<Select>(Identifiers.Cli.Component.Select).render(message, choices, options);
	}

	public spinner(options?: string | Options): Ora {
		return this.app.get<Spinner>(Identifiers.Cli.Component.Spinner).render(options);
	}

	public success(message: string): void {
		return this.app.get<Success>(Identifiers.Cli.Component.Success).render(message);
	}

	public table(head: string[], callback: (table: Table3.Table) => void, options: object = {}): void {
		return this.app.get<Table>(Identifiers.Cli.Component.Table).render(head, callback, options);
	}

	public async taskList(tasks: Task[]): Promise<void> {
		return this.app.get<TaskList>(Identifiers.Cli.Component.TaskList).render(tasks);
	}

	public async title(title: string): Promise<void> {
		return this.app.get<Title>(Identifiers.Cli.Component.Title).render(title);
	}

	public async toggle(message: string, options: object = {}): Promise<boolean> {
		return this.app.get<Toggle>(Identifiers.Cli.Component.Toggle).render(message, options);
	}

	public warning(message: string): void {
		return this.app.get<Warning>(Identifiers.Cli.Component.Warning).render(message);
	}
}
