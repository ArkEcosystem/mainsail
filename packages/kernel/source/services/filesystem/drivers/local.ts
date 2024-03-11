import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { resolve } from "path";

@injectable()
export class LocalFilesystem implements Contracts.Kernel.Filesystem {
	// https://github.com/jprichardson/node-fs-extra/issues/743#issuecomment-580346768
	private fsExtra!: typeof import("fs-extra/esm");
	private fs!: typeof import("fs");

	public async make(): Promise<Contracts.Kernel.Filesystem> {
		this.fsExtra = await import("fs-extra/esm");
		this.fs = await import("fs");

		return this;
	}

	public async exists(path: string): Promise<boolean> {
		return this.fsExtra.pathExists(path);
	}

	public async get(path: string): Promise<Buffer> {
		return this.fs.readFileSync(path);
	}

	public async put(path: string, contents: string): Promise<boolean> {
		try {
			this.fs.writeFileSync(path, contents);

			return true;
		} catch {
			return false;
		}
	}

	public async delete(path: string): Promise<boolean> {
		try {
			await this.fsExtra.remove(path);

			return true;
		} catch {
			return false;
		}
	}

	public async copy(from: string, to: string): Promise<boolean> {
		try {
			await this.fsExtra.copy(from, to);

			return true;
		} catch {
			return false;
		}
	}

	public async move(from: string, to: string): Promise<boolean> {
		try {
			await this.fsExtra.move(from, to);

			return true;
		} catch {
			return false;
		}
	}

	public async size(path: string): Promise<number> {
		return this.fs.statSync(path).size;
	}

	public async lastModified(path: string): Promise<number> {
		return +this.fs.statSync(path).mtime;
	}

	public async files(directory: string): Promise<string[]> {
		directory = resolve(directory);

		return this.fs
			.readdirSync(directory)
			.map((item: string) => `${directory}/${item}`)
			.filter(async (item: string) => this.fs.lstatSync(item).isFile());
	}

	public async directories(directory: string): Promise<string[]> {
		directory = resolve(directory);

		return this.fs
			.readdirSync(directory)
			.map((item: string) => `${directory}/${item}`)
			.filter(async (item: string) => this.fs.lstatSync(item).isDirectory());
	}

	public async makeDirectory(path): Promise<boolean> {
		try {
			await this.fsExtra.ensureDir(path);

			return true;
		} catch {
			return false;
		}
	}

	public async deleteDirectory(directory: string): Promise<boolean> {
		try {
			await this.fsExtra.remove(directory);

			return true;
		} catch {
			return false;
		}
	}

	public writeFileSync(file: string, data: string | NodeJS.ArrayBufferView, options: any): void {
		return this.fs.writeFileSync(file, data, options);
	}

	public existsSync(path: string): boolean {
		return this.fs.existsSync(path);
	}

	public removeSync(path: string): void {
		return this.fsExtra.removeSync(path);
	}

	public readJSONSync<T>(file: string, options?: Record<string, any>): T {
		return this.fsExtra.readJSONSync(file, options);
	}

	public ensureDirSync(path: string, options?: any): void {
		return this.fsExtra.ensureDirSync(path, options);
	}
}
