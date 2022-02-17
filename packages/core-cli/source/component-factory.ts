import { Options, Ora } from "ora";
import { JsonObject } from "type-fest";

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
} from "./components";
import { Application } from "./contracts";
import { Identifiers, inject, injectable } from "./ioc";

@injectable()
export class ComponentFactory {
	@inject(Identifiers.Application)
	protected readonly app!: Application;

	public appHeader(): string {
		return this.app.get<AppHeader>(Identifiers.AppHeader).render();
	}

	public async askDate(message: string, opts: object = {}): Promise<string> {
		return this.app.get<AskDate>(Identifiers.AskDate).render(message, opts);
	}

	public async askHidden(message: string, opts: object = {}): Promise<string> {
		return this.app.get<AskHidden>(Identifiers.AskHidden).render(message, opts);
	}

	public async askNumber(message: string, opts: object = {}): Promise<number> {
		return this.app.get<AskNumber>(Identifiers.AskNumber).render(message, opts);
	}

	public async askPassword(message: string, opts: object = {}): Promise<string> {
		return this.app.get<AskPassword>(Identifiers.AskPassword).render(message, opts);
	}

	public async ask(message: string, opts: object = {}): Promise<string> {
		return this.app.get<Ask>(Identifiers.Ask).render(message, opts);
	}

	public async autoComplete(message: string, choices: any[], opts: object = {}): Promise<string> {
		return this.app.get<AutoComplete>(Identifiers.AutoComplete).render(message, choices, opts);
	}

	public box(message: string): void {
		return this.app.get<Box>(Identifiers.Box).render(message);
	}

	public clear(): void {
		return this.app.get<Clear>(Identifiers.Clear).render();
	}

	public async confirm(message: string, opts: object = {}): Promise<boolean> {
		return this.app.get<Confirm>(Identifiers.Confirm).render(message, opts);
	}

	public error(message: string): void {
		return this.app.get<Error>(Identifiers.Error).render(message);
	}

	public fatal(message: string): void {
		return this.app.get<Fatal>(Identifiers.Fatal).render(message);
	}

	public info(message: string): void {
		return this.app.get<Info>(Identifiers.Info).render(message);
	}

	public async listing(elements: string[]): Promise<void> {
		return this.app.get<Listing>(Identifiers.Listing).render(elements);
	}

	public log(message: string): void {
		return this.app.get<Log>(Identifiers.Log).render(message);
	}

	public async multiSelect(message: string, choices: any[], opts: object = {}): Promise<string[]> {
		return this.app.get<MultiSelect>(Identifiers.MultiSelect).render(message, choices, opts);
	}

	public newLine(count: number = 1): void {
		return this.app.get<NewLine>(Identifiers.NewLine).render(count);
	}

	public async prompt(options: object): Promise<JsonObject> {
		return this.app.get<Prompt>(Identifiers.Prompt).render(options);
	}

	public async select(message: string, choices: any[], opts: object = {}): Promise<string> {
		return this.app.get<Select>(Identifiers.Select).render(message, choices, opts);
	}

	public spinner(options?: string | Options | undefined): Ora {
		return this.app.get<Spinner>(Identifiers.Spinner).render(options);
	}

	public success(message: string): void {
		return this.app.get<Success>(Identifiers.Success).render(message);
	}

	public table(head: string[], callback: any, opts: object = {}): void {
		return this.app.get<Table>(Identifiers.Table).render(head, callback, opts);
	}

	public async taskList(tasks: { title: string; task: any }[]): Promise<void> {
		return this.app.get<TaskList>(Identifiers.TaskList).render(tasks);
	}

	public async title(title: string): Promise<void> {
		return this.app.get<Title>(Identifiers.Title).render(title);
	}

	public async toggle(message: string, opts: object = {}): Promise<boolean> {
		return this.app.get<Toggle>(Identifiers.Toggle).render(message, opts);
	}

	public warning(message: string): void {
		return this.app.get<Warning>(Identifiers.Warning).render(message);
	}
}
