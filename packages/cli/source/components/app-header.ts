import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { red, white } from "kleur";
import os from "os";

import { Identifiers } from "../ioc/index.js";

@injectable()
export class AppHeader {
	@inject(Identifiers.Package)
	private readonly pkg!: Contracts.Types.PackageJson;

	public render(): string {
		return `${red().bold(`${this.pkg.description}`)} ${white().bold(
			`[${this.pkg.version} | ${process.version} | ${os.platform()}@${os.arch()}]`,
		)}`;
	}
}
