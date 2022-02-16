const {
    unionBy
} = require('../dist')
const lodash = require('lodash/unionBy')

exports['utils'] = () => unionBy([2.1], [1.2, 2.3], Math.floor);

exports['lodash'] = () => lodash([2.1], [1.2, 2.3], Math.floor);
