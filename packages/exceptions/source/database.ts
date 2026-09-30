import { Exception } from "./base.js";

export class DatabaseException extends Exception {}

export class InvalidCriteria extends DatabaseException {}
