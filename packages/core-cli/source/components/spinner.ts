import ora, { Options, Ora } from "ora";

import { injectable } from "../ioc";

@injectable()
export class Spinner {
	public render(options?: string | Options | undefined): Ora {
		return ora(options);
	}
}
