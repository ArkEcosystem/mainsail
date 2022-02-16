const {
    isString
} = require('../dist')
const lodash = require('lodash/isString')

exports['utils'] = () => isString('abc');

exports['lodash'] = () => lodash('abc');
