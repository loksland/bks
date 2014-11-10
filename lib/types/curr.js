
var fs = require('fs');
var path = require('path'); 
// https://www.npmjs.org/package/currency.js
var currency = require('currency.js');
var utils = require('../utils.js');

var value;

var curr = module.exports = function(){
	
	value = currency(0);
	
};

curr.prototype.getValue = function(){

	return value.intValue;
	
};

curr.prototype.setValue = function(str){
	
	str = utils.trim(str);
	
	value = currency(0);
	
	if (!str){
		// Blank input
		return;	
	}
	
	if (str.match(/[^0-9\.\-\, ]/g)){
		return new Error('Invalid chars in "'+str+'"');
	}
	
	str = str.replace(/[^0-9\.\-]/g, '');
	
	if (str.split('.').length > 2){
		return new Error('Unable to parse "'+str+'", too many .s');
	}
	
	var num = Number(str);
	
	if (isNaN(num)){
		return new Error('Unable to parse "'+str+'" as num');
	}
	
	if (num < 0){
		return new Error('Negative values not supported');
	}
	
	value = currency(num);
	
};

curr.prototype.isEmpty = function(){
	return value.intValue === 0;
};

curr.prototype.readable = function(){
	
	return value.format();
	
};

curr.prototype.inputHelp = function(){
	
	return 'Enter amount in dollars and cents. Eg "10.30", ".99", "50"';

};


