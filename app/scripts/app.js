'use strict';
var _ = require('ramda');
let message = 'goodbye world...!';

let log = (input) => console.log(input);
log(message);
log(_.add(2,3));
