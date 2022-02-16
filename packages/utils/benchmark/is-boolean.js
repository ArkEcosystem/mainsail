const {
    isBoolean
} = require('../dist')
const lodash = require('lodash/isBoolean')

exports['utils'] = () => isBoolean('abc');

exports['lodash'] = () => lodash('abc');
