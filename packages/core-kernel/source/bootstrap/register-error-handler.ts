import { injectable } from "@arkecosystem/core-container";
import logProcessErrors from "log-process-errors";

import { Bootstrapper } from "./interfaces";

@injectable()
export class RegisterErrorHandler implements Bootstrapper {
	public async bootstrap(): Promise<void> {
		// todo: implement passing in of options and ensure handling of critical exceptions
		logProcessErrors({ exitOn: [] });
	}
}
