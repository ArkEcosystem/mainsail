const {
    isFunction
} = require('../dist')
const lodash = require('lodash/isFunction')

exports['utils'] = () => isFunction('abc');

exports['lodash'] = () => lodash('abc');
