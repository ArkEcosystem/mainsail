import { RuntimeException } from "./runtime.js";

export class FileException extends RuntimeException {}

export class AccessDenied extends FileException {
	public constructor(path: string) {
		super(`The file ${path} could not be accessed.`);
	}
}

export class CannotWriteFile extends FileException {}

export class DirectoryCannotBeFound extends FileException {
	public constructor(value: string) {
		super(`Directory [${value}] could not be found.`);
	}
}
