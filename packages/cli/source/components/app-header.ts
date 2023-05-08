import { inject, injectable } from "@mainsail/container";
import { red, white } from "kleur";
import os from "os";
import { PackageJson } from "type-fest";

import { Identifiers } from "../ioc";

@injectable()
export class AppHeader {
	@inject(Identifiers.Package)
	private readonly pkg!: PackageJson;

	public render(): string {
		return `${red().bold(`${this.pkg.description}`)} ${white().bold(
			`[${this.pkg.version} | ${process.version} | ${os.platform()}@${os.arch()}]`,
		)}`;
	}
}
