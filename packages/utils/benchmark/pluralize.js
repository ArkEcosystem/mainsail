const {
    pluralize
} = require('../dist')
const pluralizeFull = require('pluralize')

exports['utils'] = () => pluralize('block');

exports['pluralize'] = () => pluralizeFull('block');
