import { Exceptions } from "@mainsail/contracts";
import { existsSync } from "fs";
import { extract } from "tar";

import { AbstractSource } from "./abstract-source.js";

export class File extends AbstractSource {
	public constructor(paths: { data: string; temp: string }) {
		super(paths);
	}

	public async exists(value: string): Promise<boolean> {
		return existsSync(value);
	}

	public async update(value: string): Promise<void> {
		await this.install(value);
	}

	protected async preparePackage(value: string): Promise<void> {
		await extract(
			{
				cwd: this.tempPath,
				file: value,
			},
			["package"],
		);

		if (!existsSync(this.getOriginPath())) {
			throw new Exceptions.MissingPackageFolder();
		}
	}
}
