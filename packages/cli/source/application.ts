import { Identifiers } from "@mainsail/constants";
import { Application as BaseApplication } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { resolve } from "path";

export class Application extends BaseApplication {
	public constructor() {
		super();
		this.bind(Identifiers.Cli.Application.Instance).toConstantValue(this);
	}

	public getCorePath(type: string, file?: string): string {
		const path: string = this.get<Contracts.Cli.Paths>(Identifiers.Cli.Paths.Application)[type];

		return resolve(file ? `${path}/${file}` : path);
	}

	public getConsolePath(type: string, file?: string): string {
		const path: string = this.get<Contracts.Cli.Paths>(Identifiers.Cli.Paths.Console)[type];

		return resolve(file ? `${path}/${file}` : path);
	}
}
