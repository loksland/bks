// http://www.markhansen.co.nz/javascript-private-members/
var fs = require('fs');
var path = require('path'); 
var utils = require('../utils.js');

var bool = module.exports = function(){
	 
	var value = false;
	
	return {
		
		getValue : function(){
			
			return value;
			
		},
		
		setValue : function(obj){
			
			if (!obj){
				value = false;
				return;
			} 
	
			if (utils.isBool(obj)){
				value = obj;
				return;
			}
	
			var chr = utils.trim(String(obj)).toLowerCase().charAt(0);
			value = (chr === '1' || chr === 't' || chr === 'y');
		
		},
		
		isEmpty: function(){
			
			return false;
			
		},
		
		readable: function(){

			return value ? 'true' : 'false';

		}, 
		
		inputHelp: function(){
	
			return 'Enter any boolean. Eg "yes", "Y", "1", "true", "no", "N", "0", "false"';

		}
	};
	
};