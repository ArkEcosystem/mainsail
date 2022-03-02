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
}
