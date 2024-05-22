import { Store } from "./store.js";

export interface Exporter {
	export(store: Store, path: string): Promise<void>;
}

export interface Importer {
	import(maxHeight: number, store: Store): Promise<void>;
}

export interface SnapshotService {
	listSnapshots(): Promise<number[]>;
	export(store: Store): Promise<void>;
}
