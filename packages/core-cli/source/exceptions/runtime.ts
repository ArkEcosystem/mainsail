import { Exception } from "./base";

export class RuntimeException extends Exception {}

export class FatalException extends RuntimeException {}
