import { Utils } from "@arkecosystem/core-kernel";
import execa from "execa";

import { AbstractSource } from "./abstract-source";

export class Git extends AbstractSource {
	public constructor(paths: { data: string; temp: string }) {
		super(paths);
	}

	public async exists(value: string): Promise<boolean> {
		return Utils.isGit(value);
	}

	public async update(value: string): Promise<void> {
		const dest = this.getDestPath(value);

		execa.sync(`git`, ["reset", "--hard"], { cwd: dest });
		execa.sync(`git`, ["pull"], { cwd: dest });

		await this.installDependencies(value);
	}

	protected async preparePackage(value: string): Promise<void> {
		execa.sync(`git`, ["clone", value, this.getOriginPath()]);
	}
}
