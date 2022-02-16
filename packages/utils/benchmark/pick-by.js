const {
    isNumber,
    pickBy
} = require('../dist')
const lodash = require('lodash/pickBy')

exports['utils'] = () => pickBy({
    'a': 1,
    'b': '2',
    'c': 3
}, isNumber);

exports['lodash'] = () => lodash({
    'a': 1,
    'b': '2',
    'c': 3
}, isNumber);
