import { Exception } from "./base";

export class CacheException extends Exception {}

export class InvalidArgument extends CacheException {}
