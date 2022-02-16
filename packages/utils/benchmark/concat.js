const {
    concat
} = require('../dist')
const lodash = require('lodash/concat')

exports['utils'] = () => concat([1], [2]);

exports['lodash'] = () => lodash([1], [2]);
