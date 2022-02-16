const {
    toString
} = require('../dist')
const lodash = require('lodash/toString')

exports['utils'] = () => toString([1, 2, 3]);

exports['lodash'] = () => lodash([1, 2, 3]);
