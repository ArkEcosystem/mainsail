import { Exception } from "./base";

export class InvalidCriteria extends Exception {
	public constructor(
		public readonly value: unknown,
		public readonly criteria: unknown,
		public readonly path: string[],
	) {
		super(InvalidCriteria.getMessage(value, criteria, path));
	}

	private static getMessage(value: unknown, criteria: unknown, path: string[]): string {
		let c: string;

		if (typeof criteria === "object") {
			if (criteria === null) {
				c = "'null'";
			} else {
				c = `'${criteria}' (${criteria.constructor.name})`;
			}
		} else {
			c = `'${criteria}' (${typeof criteria})`;
		}

		let v: string;

		if (typeof value === "object") {
			if (value === null) {
				v = "null";
			} else {
				v = value.constructor.name;
			}
		} else {
			v = typeof value;
		}

		if (path.length > 0) {
			return `Invalid criteria ${c} at '${path.join(".")}' for ${v} value`;
		} else {
			return `Invalid criteria ${c} for ${v} value`;
		}
	}
}

export class UnsupportedValue extends Exception {
	public constructor(public readonly value: unknown, public readonly path: string[]) {
		super(UnsupportedValue.getMessage(value, path));
	}

	private static getMessage(value: unknown, path: string[]): string {
		let v: string;

		if (Array.isArray(value)) {
			v = `Array(${value.length})`;
		} else if (typeof value === "object") {
			if (value === null) {
				v = "'null'";
			} else {
				v = `'${value}' (${value.constructor.name})`;
			}
		} else {
			v = `'${value}' (${typeof value})`;
		}

		if (path.length > 0) {
			return `Unsupported value ${v} at '${path.join(".")}'`;
		} else {
			return `Unsupported value ${v}`;
		}
	}
}
