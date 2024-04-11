import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import logProcessErrors from "log-process-errors";

@injectable()
export class RegisterErrorHandler implements Contracts.Kernel.Bootstrapper {
	public async bootstrap(): Promise<void> {
		// @TODO implement passing in of options and ensure handling of critical exceptions
		logProcessErrors({ exit: false });
	}
}
