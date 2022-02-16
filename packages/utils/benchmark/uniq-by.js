const {
    uniqBy
} = require('../dist')
const lodash = require('lodash/uniqBy')

exports['utils'] = () => uniqBy([2.1, 1.2, 2.3], Math.floor);

exports['lodash'] = () => lodash([2.1, 1.2, 2.3], Math.floor);
