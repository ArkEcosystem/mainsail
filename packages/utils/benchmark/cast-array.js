const {
    castArray
} = require('../dist')
const lodash = require('lodash/castArray')

exports['utils'] = () => castArray('abc');

exports['lodash'] = () => lodash('abc');
