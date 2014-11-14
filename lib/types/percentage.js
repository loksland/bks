
var fs = require('fs');
var path = require('path'); 
var utils = require('../utils.js');

// Stored in whole percentages
var value;

var percentage = module.exports = function(){
	
	value = 0;
	
};

percentage.prototype.getValue = function(){

	return value/100;
	
};

percentage.prototype.setValue = function(obj){
	
	var num;
	if (utils.isNum(obj)){
		num = obj;
	} else if (utils.isStr(obj)){		
		var str = utils.trim(String(obj));
		if (str.split('%').length === 2){
			str = utils.removeNonNumericChars(str, true, true);			
			num = Number(str)/100;
		} else {
			num = Number(utils.removeNonNumericChars(str, true, true));
		}
	}
	
	if (num === undefined || isNaN(num)){
		return new Error('Unable to interpret "'+String(obj)+'" as a number');
	}
	
	// Note: rounding to nearest whole percentage.
	num = Math.round(num * 100);
	
	if (num < 0){
		return new Error('Input must be over zero "'+String(num < 0)+'"');
	}	
	if (num > 100){
		return new Error('Input must be under 100%. Enter an number between 0.0 and 1.0');
	}	
	
	value = num;
	
};

percentage.prototype.isEmpty = function(){
	return false;
};

percentage.prototype.readable = function(){
	
	return String(value) + '%';
	
};

percentage.prototype.inputHelp = function(){
	
	return 'Enter an number between 0.0 and 1.0';

};

