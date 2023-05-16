import { Contracts } from "@mainsail/contracts";

@injectable()
export class NullValidator implements Contracts.Kernel.Validator {
	public validate(data: Contracts.Types.JsonObject, schema: object): void {
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

	public valid(): Contracts.Types.JsonObject | undefined {
		return undefined;
	}

	public invalid(): Contracts.Types.JsonObject {
		return {};
	}

	public attributes(): Contracts.Types.JsonObject {
		return {};
	}
}
