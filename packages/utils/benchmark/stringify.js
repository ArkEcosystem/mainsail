const {
    stringify
} = require('../dist')

exports['native'] = () => JSON.stringify([1, 2, 3]);

exports['utils'] = () => stringify([1, 2, 3]);
