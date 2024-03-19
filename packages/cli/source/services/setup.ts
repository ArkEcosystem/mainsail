import { injectable } from "@mainsail/container";
import { join } from "path";

import { execa } from "../execa.js";

@injectable()
export class Setup {
	public isGlobal(): boolean {
		try {
			const globalDir = this.getGlobalRootDir();
			return !!(globalDir && this.getLocalEntrypoint().startsWith(globalDir.replace("node_modules", "")));
		} catch {
			return false;
		}
	}

	public getLocalEntrypoint(): string {
		return require.main!.filename;
	}

	public getGlobalEntrypoint(packageId: string): string {
		return join(this.getGlobalRootDir(), `${packageId}/bin/run`);
	}

	private getGlobalRootDir(): string {
		const { stdout, exitCode } = execa.sync(`pnpm root -g dir`, { shell: true });

		if (exitCode !== 0) {
			throw new Error("Cannot determine global pnpm dir");
		}

		return stdout;
	}
}
