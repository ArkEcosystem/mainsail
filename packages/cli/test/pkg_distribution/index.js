// module.exports = {
// 	Commands: [require("./hidden").Command, require("./visible").Command],
// };

import { Command as VersionCommand } from "./version.js";

export const Commands = [VersionCommand];
