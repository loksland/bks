
var fs = require('fs');
var path = require('path'); 
var utils = require('../utils.js');

var value;

var str = module.exports = function(){
	
	value = '';
	
};

str.prototype.getValue = function(){

	return value;
	
}; 

str.prototype.setValue = function(obj){

	if (!obj){
		value = '';
		return;
	} 
	
	value = utils.trim(String(obj)); 
	
};

str.prototype.isEmpty = function(){

	return !utils.isSet(value);
	
};

str.prototype.readable = function(){
	
	return value;
	
};

str.prototype.inputHelp = function(){
	
	return 'Enter a text value. Spaces and punctuation ok';

};

