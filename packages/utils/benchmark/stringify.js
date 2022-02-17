const { stringify } = require("../distribution");

exports["native"] = () => JSON.stringify([1, 2, 3]);

exports["utils"] = () => stringify([1, 2, 3]);
