import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { bold, red, white } from "kleur/colors";
import os from "os";

@injectable()
export class AppHeader {
	@inject(Identifiers.Cli.Package)
	private readonly pkg!: Contracts.Types.PackageJson;

	public render(): string {
		return `${red(bold(`${this.pkg.description}`))} ${white(
			bold(`[${this.pkg.version} | ${process.version} | ${os.platform()}@${os.arch()}]`),
		)}`;
	}
}
