import { AnySchema } from "joi";

import { InputArgument, InputArguments } from "../contracts";

export class InputDefinition {
	private readonly arguments: InputArguments = {};

	private readonly flags: InputArguments = {};

	public getArguments(): InputArguments {
		return this.arguments;
	}

	public getArgument(name: string): InputArgument {
		return this.arguments[name];
	}

	public setArgument(name: string, description: string, schema: AnySchema): this {
		this.arguments[name] = { description, schema };

		return this;
	}

	public hasArgument(name: string): boolean {
		return this.arguments[name] !== undefined;
	}

	public getFlags(): InputArguments {
		return this.flags;
	}

	public getFlag(name: string): InputArgument {
		return this.flags[name];
	}

	public setFlag(name: string, description: string, schema: AnySchema): this {
		this.flags[name] = { description, schema };

		return this;
	}

	public hasFlag(name: string): boolean {
		return this.flags[name] !== undefined;
	}
}
