const {
    reduce
} = require('../dist')
const lodash = require('lodash/reduce')

exports['native'] = () => [1, 2].reduce((sum, n) => sum + n, 0);

exports['utils'] = () => reduce([1, 2], (sum, n) => sum + n, 0);

exports['lodash'] = () => lodash([1, 2], (sum, n) => sum + n, 0);
