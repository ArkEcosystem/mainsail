import { Exception } from "./base.js";

export class RuntimeException extends Exception {}

export class FatalException extends RuntimeException {}
