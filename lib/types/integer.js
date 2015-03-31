
var fs = require('fs');
var path = require('path'); 
var utils = require('../utils.js');

var integer = module.exports = function(){
	 
	// Stored in whole percentages
	var value = null;
	
	return {
		
		getValue : function(){
			
			return value;
			
		},
		
		clear: function(){
			
			value = null;
						
		},
		
		setValue : function(obj){
			
			if (isNaN(obj)){
				
				return new Error('Unable to interpret "'+String(obj)+'" as a number');
			
			} else if (Number(obj) != Math.round(obj)){
				
				return new Error('Number must be an integer "'+String(obj)+'"');
				
			}
			
			value = Number(obj);
		
		},
		
		isSet: function(){
			
			return value !== null;
			
		},
		
		isEmpty: function(){
			
			return !this.isSet();
			
		},
		
		readable: function(){

			return this.isSet() ? String(value) : '';

		}, 
		
		val: function(){
		
			return this.isSet() ? value : null;
			
		},
		
		inputHelp: function(){
	
			return 'Enter an integer value';

		}
	};
	
};