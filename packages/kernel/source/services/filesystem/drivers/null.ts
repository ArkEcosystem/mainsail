import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class NullFilesystem implements Contracts.Kernel.Filesystem {
	public async make(): Promise<Contracts.Kernel.Filesystem> {
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

	public writeFileSync(file: string, data: string | NodeJS.ArrayBufferView, options: any): void {
		return;
	}

	public existsSync(path: string): boolean {
		return false;
	}

	public removeSync(path: string): void {
		return;
	}

	public readJSONSync<T>(file: string, options?: Record<string, any>): T {
		return undefined as T;
	}

	public ensureDirSync(path: string, options?: any): void {
		return;
	}
}
