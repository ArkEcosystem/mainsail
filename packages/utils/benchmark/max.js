const {
    max
} = require('../dist')
const lodash = require('lodash/max')

exports['utils'] = () => max([4, 2, 8, 6]);

exports['lodash'] = () => lodash([4, 2, 8, 6]);
