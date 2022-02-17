import { Validator } from "../../../contracts/kernel/validation";
import { injectable } from "../../../ioc";
import { JsonObject } from "../../../types";

@injectable()
export class NullValidator implements Validator {
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
