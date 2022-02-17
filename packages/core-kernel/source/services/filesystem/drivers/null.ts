import { Filesystem } from "../../../contracts/kernel/filesystem";
import { injectable } from "../../../ioc";

@injectable()
export class NullFilesystem implements Filesystem {
	public async make(): Promise<Filesystem> {
		return this;
	}

	public async exists(path: string): Promise<boolean> {
		return false;
	}

	public async get(path: string): Promise<Buffer> {
		return Buffer.alloc(0);
	}

	public async put(path: string, contents: string): Promise<boolean> {
		return false;
	}

	public async delete(path: string): Promise<boolean> {
		return false;
	}

	public async copy(from: string, to: string): Promise<boolean> {
		return false;
	}

	public async move(from: string, to: string): Promise<boolean> {
		return false;
	}

	public async size(path: string): Promise<number> {
		return 0;
	}

	public async lastModified(path: string): Promise<number> {
		return 0;
	}

	public async files(directory: string): Promise<string[]> {
		return [];
	}

	public async directories(directory: string): Promise<string[]> {
		return [];
	}

	public async makeDirectory(path): Promise<boolean> {
		return false;
	}

	public async deleteDirectory(directory: string): Promise<boolean> {
		return false;
	}
}
