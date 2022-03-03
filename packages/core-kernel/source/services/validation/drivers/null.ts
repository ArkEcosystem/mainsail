import { injectable } from "@arkecosystem/core-container";
import { Kernel } from "@arkecosystem/core-contracts";

import { JsonObject } from "../../../types";

@injectable()
export class NullValidator implements Kernel.Validator {
	public validate(data: JsonObject, schema: object): void {
		//
	}

	public passes(): boolean {
		return false;
	}

	public fails(): boolean {
		return true;
	}

	public failed(): Record<string, string[]> {
		return {};
	}

	public errors(): Record<string, string[]> {
		return {};
	}

	public valid(): JsonObject | undefined {
		return undefined;
	}

	public invalid(): JsonObject {
		return {};
	}

	public attributes(): JsonObject {
		return {};
	}
}
