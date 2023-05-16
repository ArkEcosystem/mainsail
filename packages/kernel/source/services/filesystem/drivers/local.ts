import { Contracts } from "@mainsail/contracts";
import {
	copyFile,
	ensureDir,
	lstat,
	move,
	pathExists,
	readdir,
	readFile,
	remove,
	rmdir,
	stat,
	writeFile,
} from "fs-extra";
import { resolve } from "path";

@injectable()
export class LocalFilesystem implements Contracts.Kernel.Filesystem {
	public async make(): Promise<Contracts.Kernel.Filesystem> {
		return this;
	}

	public async exists(path: string): Promise<boolean> {
		return pathExists(path);
	}

	public async get(path: string): Promise<Buffer> {
		return readFile(path);
	}

	public async put(path: string, contents: string): Promise<boolean> {
		try {
			await writeFile(path, contents);

			return true;
		} catch {
			return false;
		}
	}

	public async delete(path: string): Promise<boolean> {
		try {
			await remove(path);

			return true;
		} catch {
			return false;
		}
	}

	public async copy(from: string, to: string): Promise<boolean> {
		try {
			await copyFile(from, to);

			return true;
		} catch {
			return false;
		}
	}

	public async move(from: string, to: string): Promise<boolean> {
		try {
			await move(from, to);

			return true;
		} catch {
			return false;
		}
	}

	public async size(path: string): Promise<number> {
		return (await stat(path)).size;
	}

	public async lastModified(path: string): Promise<number> {
		return +(await stat(path)).mtime;
	}

	public async files(directory: string): Promise<string[]> {
		directory = resolve(directory);

		return (await readdir(directory))
			.map((item: string) => `${directory}/${item}`)
			.filter(async (item: string) => (await lstat(item)).isFile());
	}

	public async directories(directory: string): Promise<string[]> {
		directory = resolve(directory);

		return (await readdir(directory))
			.map((item: string) => `${directory}/${item}`)
			.filter(async (item: string) => (await lstat(item)).isDirectory());
	}

	public async makeDirectory(path): Promise<boolean> {
		try {
			await ensureDir(path);

			return true;
		} catch {
			return false;
		}
	}

	public async deleteDirectory(directory: string): Promise<boolean> {
		try {
			await rmdir(directory);

			return true;
		} catch {
			return false;
		}
	}
}
