
var fs = require('fs');
var path = require('path'); 
var moment = require('moment');
var currency = require('currency.js');

var utils = module.exports = {};

utils.addTrailingSlash = function(dirPath){

	if (dirPath.charAt(dirPath.length - 1) !== path.sep){
		return dirPath + path.sep;
	} 
	
	return dirPath; 
	
};

// Converts human readable |str| to a boolean. 
// Case insensitive. 
// Eg. true, yes, y, 1 VS false, no, n, 0
utils.stringToBool = function(str){
	
	if (!str || str.length === 0){
		return false; 
	}
	
	str = str.toLowerCase();
	return str.charAt(0) === 'y' || str.charAt(0) === '1' || str.charAt(0) === 't';
	
};

// Trims whitespace at start and end of string
utils.trim = function(str) {
  return (str && str.replace) ? str.replace(/^\s+|\s+$/g, '') : str;
};

// Returns true if |str| is not null or undefined and has any non-whitespace content
utils.isSet = function(str){
	
	if (str){
		return utils.trim(str).length > 0;
	}
	
	return false;
	
};

utils.getCurrentFiscalYear = function(){
	
	var now = moment();
	var year = now.year();
	if (now.month() <= 5){
		year--;
	} 
	
	return year;
};

utils.cameCaseToSentence = function(varStr){

	var sentence = varStr.replace(/([a-z])([A-Z])/gm, '$1 $2').toLowerCase();
	if (sentence.length === 1){
		sentence = sentence.toUpperCase();
	} else if (sentence.length > 1){
		sentence = sentence.charAt(0).toUpperCase() + sentence.substr(1).toLowerCase();
	}
	
	return sentence;
	
};

utils.removeNonNumericChars = function(str, allowNegative, allowFractions){
	
	var allowNegativeFilter = allowNegative ? '\\-' : '';
	var allowFractionsFilter = allowFractions ? '\\.' : '';
	
	var filter = new RegExp('([^0-9'+allowNegativeFilter+allowFractionsFilter+'])', 'gm');
	
	return str.replace(filter, '');
	
};

utils.isObjectAnError = function(obj){
	return Object.prototype.toString.call(obj).toLowerCase() === '[object error]';
};

utils.isBool = function(obj){
	return (typeof obj) === 'boolean';
};

utils.isNum = function(obj){
	return (typeof obj) === 'number';
};

utils.isStr = function(obj){
	return (typeof obj) === 'string';
};

utils.isMomentObj = function(obj){
	return Boolean(obj._isAMomentObject);
};

utils.isCurrencyObj = function(obj){
	
	return obj.dollars && obj.cents && obj.format;
	
};

utils.shallowDupe = function(obj){

	var dupeObj = {};
	for (var p in obj){
		dupeObj[p] = obj[p];
	}
	
	return dupeObj;
	
};
