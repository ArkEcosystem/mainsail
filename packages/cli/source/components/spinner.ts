import { injectable } from "@mainsail/container";
import ora, { Options, Ora } from "ora";

@injectable()
export class Spinner {
	public render(options?: string | Options | undefined): Ora {
		return ora(options);
	}
}
