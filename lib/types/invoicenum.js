
var fs = require('fs');
var path = require('path'); 
var utils = require('../utils.js');

var invoicenum = module.exports = function(){
	 
	var value = null;
	var regex = /^([A-Z]{3})([0-9]{3})-([0-9])$/; 
	
	return {
		
		getValue : function(){
			
			return value;
			
		},
		
		setValue : function(obj){
			
			if (!obj){
				value = '';
				return;
			}
			
			var inum = utils.trim(String(obj).toUpperCase());
			
			// https://regex101.com/r/qL4xR6/1
			
			var m;
 			
			if ((m = regex.exec(inum)) !== null) {
			
					if (m.index === regex.lastIndex) {
							regex.lastIndex++;
					}
					//console.log('0:' + m[0]);
					console.log('1:' + m[1]);
					console.log('2:' + m[2]);
					console.log('2:' + m[3]);
			} else {
				return new Error('Invalid format');
			}
			
			value = inum;

		},
		
		clear: function(){
			
			value = null;
						
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
		val: function(){

			return this.readable();

		}, 
		inputHelp: function(){
	
			return 'Enter an invoice number Eg. \'CLI003-1\'. [3 char client code][3 char job num]-[1 char instalment counter]. ';

		},
		
		clientCode: function(){
			return this.getComponent(0);
		},
		
		clientJobNum: function(){
			return this.getComponent(1);
		},
		
		installment: function(){
			return this.getComponent(2);
		},
		
		getComponent: function(index){
		
			if (!this.isSet()){
				return null;
			}
			
			var m;
 			
			if ((m = regex.exec(inum)) !== null) {
			
					if (m.index === regex.lastIndex) {
							regex.lastIndex++;
					}
					return m[index + 1];
			} 
			
			return null;
			
		},
		
	};
	
};
