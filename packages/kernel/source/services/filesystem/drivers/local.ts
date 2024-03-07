import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { resolve } from "path";

@injectable()
export class LocalFilesystem implements Contracts.Kernel.Filesystem {
	// https://github.com/jprichardson/node-fs-extra/issues/743#issuecomment-580346768
	private fs!: typeof import("fs-extra");

	public async make(): Promise<Contracts.Kernel.Filesystem> {
		this.fs = await import("fs-extra");

		return this;
	}

	public async exists(path: string): Promise<boolean> {
		return this.fs.pathExists(path);
	}

	public async get(path: string): Promise<Buffer> {
		return this.fs.readFile(path);
	}

	public async put(path: string, contents: string): Promise<boolean> {
		try {
			await this.fs.writeFile(path, contents);

			return true;
		} catch {
			return false;
		}
	}

	public async delete(path: string): Promise<boolean> {
		try {
			await this.fs.remove(path);

			return true;
		} catch {
			return false;
		}
	}

	public async copy(from: string, to: string): Promise<boolean> {
		try {
			await this.fs.copyFile(from, to);

			return true;
		} catch {
			return false;
		}
	}

	public async move(from: string, to: string): Promise<boolean> {
		try {
			await this.fs.move(from, to);

			return true;
		} catch {
			return false;
		}
	}

	public async size(path: string): Promise<number> {
		return (await this.fs.stat(path)).size;
	}

	public async lastModified(path: string): Promise<number> {
		return +(await this.fs.stat(path)).mtime;
	}

	public async files(directory: string): Promise<string[]> {
		directory = resolve(directory);

		return (await this.fs.readdir(directory))
			.map((item: string) => `${directory}/${item}`)
			.filter(async (item: string) => (await this.fs.lstat(item)).isFile());
	}

	public async directories(directory: string): Promise<string[]> {
		directory = resolve(directory);

		return (await this.fs.readdir(directory))
			.map((item: string) => `${directory}/${item}`)
			.filter(async (item: string) => (await this.fs.lstat(item)).isDirectory());
	}

	public async makeDirectory(path): Promise<boolean> {
		try {
			await this.fs.ensureDir(path);

			return true;
		} catch {
			return false;
		}
	}

	public async deleteDirectory(directory: string): Promise<boolean> {
		try {
			await this.fs.rmdir(directory);

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
		return this.fs.removeSync(path);
	}

	public readJSONSync<T>(file: string, options?: Record<string, any>): T {
		return this.fs.readJSONSync(file, options);
	}

	public ensureDirSync(path: string, options?: any): void {
		return this.fs.ensureDirSync(path, options);
	}
}
