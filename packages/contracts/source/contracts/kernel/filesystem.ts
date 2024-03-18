export interface Filesystem {
	make(): Promise<Filesystem>;

	exists(path: string): Promise<boolean>;

	get(path: string): Promise<Buffer>;

	put(path: string, contents: string): Promise<boolean>;

	delete(path: string): Promise<boolean>;

	copy(from: string, to: string): Promise<boolean>;

	move(from: string, to: string): Promise<boolean>;

	size(path: string): Promise<number>;

	lastModified(path: string): Promise<number>;

	files(directory: string): Promise<string[]>;

	directories(directory: string): Promise<string[]>;

	makeDirectory(path): Promise<boolean>;

	deleteDirectory(directory: string): Promise<boolean>;

	writeFileSync(file: string, data: string | NodeJS.ArrayBufferView, options: any): void;

	existsSync(path: string): boolean;

	removeSync(path: string): void;

	readJSONSync<T>(file: string, options?: Record<string, any>): T;

	ensureDirSync(path: string, options?: any): void;
}
