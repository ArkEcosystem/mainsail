import { Ipc } from "@mainsail/kernel";

import { WorkerScriptHandler } from "./worker-handler.js";

new Ipc.Handler(new WorkerScriptHandler());
