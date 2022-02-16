const {
    isEmpty
} = require('../dist')
const lodash = require('lodash/isEmpty')

exports['utils'] = () => isEmpty('abc');

exports['lodash'] = () => lodash('abc');
