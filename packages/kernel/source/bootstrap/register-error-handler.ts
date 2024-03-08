import { injectable } from "@mainsail/container";
import logProcessErrors from "log-process-errors";

import { Bootstrapper } from "./interfaces";

@injectable()
export class RegisterErrorHandler implements Bootstrapper {
	public async bootstrap(): Promise<void> {
		// @TODO implement passing in of options and ensure handling of critical exceptions
		logProcessErrors({ exit: false });
	}
}
