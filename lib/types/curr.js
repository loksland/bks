
var fs = require('fs');
var path = require('path'); 
// https://www.npmjs.org/package/currency.js
var currency = require('currency.js');
var utils = require('../utils.js');

var curr = module.exports = function(){
	 
	var value = currency(0);
	
	return {
		
		getValue : function(){
			
			return value;
			
		},
		
		setValue : function(obj){
			
			if (obj && utils.isCurrencyObj(obj)){
				if (obj.value < 0){
					return new Error('Negative values not supported');
				}
				value = currency(obj.value);
				return;
			}
	
			if (!obj){
				// Blank input
				return;	
			}
	
			var num;
	
			// A number was supplied
			if (utils.isNum(obj)){
				num = Number(obj);
				if (isNaN(num)){
					return new Error('Unable to parse "'+String(num)+'" as num');
				} else if (num < 0){
					return new Error('Negative values not supported');
				} else {
					value = currency(obj);
					return;
				}
			}
	
			// Interpret as string
			var str = utils.trim(String(obj));
	
			if (str.match(/[^0-9\.\-\, ]/g)){
				return new Error('Invalid chars in "'+str+'"');
			}
	
			str = str.replace(/[^0-9\.\-]/g, '');
	
			if (str.split('.').length > 2){
				return new Error('Unable to parse "'+str+'", too many .s');
			}
	
			num = Number(str);
	
			if (isNaN(num)){
				return new Error('Unable to parse "'+str+'" as num');
			}
	
			if (num < 0){
				return new Error('Negative values not supported');
			}
	
			value = currency(num);
		
		},
		
		isEmpty: function(){
			
			return value.intValue === 0;
			
		},
		
		readable: function(){

			return value.format();

		}, 
		
		inputHelp: function(){
	
			return 'Enter amount in dollars and cents. Eg "10.30", ".99", "50"';

		}
	};
	
};
