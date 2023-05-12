const { pluralize } = require("../distribution");
const pluralizeFull = require("pluralize");

exports["utils"] = () => pluralize("block");

exports["pluralize"] = () => pluralizeFull("block");
