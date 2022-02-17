import { injectable } from "../ioc";

@injectable()
export class Clear {
	public render(): void {
		process.stdout.write("\x1b[2J");
		process.stdout.write("\x1b[0f");
	}
}
