// module.exports = {
// 	Commands: [require("./hidden").Command, require("./visible").Command],
// };

import { Command as HiddenCommand } from "./hidden.js";
import { Command as VisibleCommand } from "./visible.js";

export const Commands = [HiddenCommand, VisibleCommand];
