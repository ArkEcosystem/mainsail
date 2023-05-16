import { Contracts } from "@mainsail/contracts";
import { red, white } from "kleur";
import os from "os";

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
