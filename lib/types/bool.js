
var fs = require('fs');
var path = require('path'); 
var utils = require('../utils.js');

var value;

var bool = module.exports = function(){
	
	value = false;
	
};

bool.prototype.getValue = function(){

	return value;
	
};

bool.prototype.setValue = function(str){

	if (!str){
		value = false;
		return;
	} 
	
	str = String(str);
	
	var chr = utils.trim(str).toLowerCase().charAt(0);
	
	value = (chr === '1' || chr === 't' || chr === 'y');
	
};

bool.prototype.isEmpty = function(){
	return false;
};

bool.prototype.readable = function(){
	
	return value ? 'true' : 'false';
	
};

bool.prototype.inputHelp = function(){
	
	return 'Enter any boolean. Eg "yes", "Y", "1", "true", "no", "N", "0", "false"';

};

