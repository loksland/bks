
var fs = require('fs');
var path = require('path'); 
var moment = require('moment');
var utils = require('../utils.js');

var value;

var date = module.exports = function(){
	
};

date.prototype.getValue = function(){

	return value;
	
};

date.prototype.setValue = function(str){
	
	value = null;
	str = utils.trim(str).toLowerCase();
	
	var possibleDateDividers = [' ','-','/'];
	
	if (!utils.isSet(str)){
		value = null;
	} else if (str === 'today'){
		value = moment();
	} else if (str === 'yesterday'){
		value = moment().subtract(1, 'days');
	} else if (str === 'tomorrow'){
		value = moment().add(1, 'days');
	} else {
		// Failed to parse
		return new Error('Unable to interpret "'+str+'" as a date');
	}
};

date.prototype.isEmpty = function(){
	return value === null;
};

date.prototype.readable = function(){
	
	return value === null ? '' : value.format('dddd MMMM Do YYYY');
	
};

date.prototype.inputHelp = function(){
	
	return 'Enter a date. Eg "today", "yesterday", "23/12", "5/5/99"';

};

