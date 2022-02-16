const {
    shuffle
} = require('../dist')
const lodash = require('lodash/shuffle')

exports['utils'] = () => shuffle([1, 2, 3, 4]);

exports['lodash'] = () => lodash([1, 2, 3, 4]);
