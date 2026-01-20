import type { AnySchema } from "joi";

export type InputValue = string | number | boolean;
export type InputValues = Record<string, InputValue>;

export type InputArgument = { description: string; schema: AnySchema };
export type InputArguments = Record<string, InputArgument>;

export type AnyObject = Record<string, string | number | boolean>;

export type Arguments = Record<string, string | number>;

export type Flags = Record<string, string | number | boolean>;

export interface CommandArgument {
	description: string;
	schema: AnySchema;
}

export type CommandArguments = Record<string, CommandArgument>;

export interface CommandFlag {
	description: string;
	schema: AnySchema;
}

export type CommandFlags = Record<string, CommandFlag>;



