
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

percentage.prototype.setValue = function(str){
	
	var num = utils.trim(str);
	
	if (isNaN(num)){
		return new Error('Unable to interpret "'+str+'" as a number');
	}
	
	// Note: rounding to nearest whole percentage.
	num = Math.round(num * 100);
	
	if (num < 0){
		return new Error('Input must be over zero "'+str+'"');
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

