// http://www.markhansen.co.nz/javascript-private-members/
var fs = require('fs');
var path = require('path'); 
var utils = require('../utils.js');

var bool = module.exports = function(){
	 
	var value = null;
	
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
		
		isSet: function(){
			
			return value !== null;
			
		},
		
		isEmpty: function(){
			
			return !this.isSet();
			
		},
		
		readable: function(){

			return this.isSet() ? (value ? 'true' : 'false') : '';
				
		}, 
		
		val: function(){
		
			return this.isSet() ? value : null;
		},
		
		clear: function(){
			
			value = null;
			
		},
		
		inputHelp: function(){
	
			return 'Enter any boolean. Eg "yes", "Y", "1", "true", "no", "N", "0", "false"';

		}
	};
	
};