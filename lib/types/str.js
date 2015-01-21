
var fs = require('fs');
var path = require('path'); 
var utils = require('../utils.js');

var str = module.exports = function(){
	 
	var value = null;
	
	return {
		
		getValue : function(){
			
			return value;
			
		},
		
		setValue : function(obj){
			
			if (!obj){
				value = '';
				return;
			} 
	
			value = utils.trim(String(obj)); 
		
		},
		
		isSet: function(){
			
			return value !== null;
			
		},
		
		isEmpty: function(){
			
			return this.isSet() ? !utils.isSet(value) : true;
			
		},
		
		readable: function(){

			return this.isSet() ? value : '' ;

		}, 
		
		inputHelp: function(){
	
			return 'Enter a text value. Spaces and punctuation ok';

		}
	};
	
};

