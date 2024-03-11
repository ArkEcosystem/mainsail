import { Store } from "./store.js";

export interface Exporter {
	export(store: Store): Promise<void>;
}

export interface Importer {
	import(maxHeight: number, store: Store): Promise<void>;
}
