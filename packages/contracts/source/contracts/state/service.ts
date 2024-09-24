import { CommitHandler } from "../crypto/commit.js";
import { Store } from "./store.js";

export interface Service extends CommitHandler {
	getStore(): Store;
}
