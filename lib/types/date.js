
var fs = require('fs');
var path = require('path'); 
var moment = require('moment');
var utils = require('../utils.js');

var MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
var DAY_SUFFIXES = ['st','nd','rd','th'];
var DAY_NAMES = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

var _date = module.exports = function(){
	 
	var value = null;
	
	return {

		getValue : function(){
			
			return value;
			
		},
		
		setValue : function(obj){
			
			if (!obj){
				value = null;
				return;
			}
			
			if (utils.isMomentObj(obj)){
				value = obj.clone();
				return;
			}
			
			var str = utils.trim(String(obj)).toLowerCase();
			var i;

			// Remove any day names
			for (i = 0; i < DAY_NAMES.length; i++){
				str = str.split(DAY_NAMES[i]).join('');
			}

			if (!utils.isSet(str)){
				value = null;
				return;
			} else if (str === 'today'){
				value = moment();
				return;
			} else if (str === 'yesterday'){
				value = moment().subtract(1, 'days');
				return;
			} else if (str === 'tomorrow'){
				value = moment().add(1, 'days');
				return;
			} 

			var possibleDateDividers = [' ','-','/','.'];

			for (i = 0; i < possibleDateDividers.length; i++){
				str = str.split(possibleDateDividers[i]).join('~');
			}
			str = str.replace(/~{2}?/g, '~');
			str = str.replace(/^~*|~*$/g, '');

			var eles = str.split('~');

			var date = {'d':0, 'm':0, 'y':0};

			if (eles.length === 1){
	
				var chunk = eles[0];
	
				var stillLooking = true;
				// Split by month name
				for (var m = 0; m < MONTHS.length; m++){
					var monthSplit = chunk.split(MONTHS[m]);
					if (monthSplit.length === 2){
						stillLooking = false;
						eles = [monthSplit[0], MONTHS[m]];
						var potentialYear = utils.removeNonNumericChars(monthSplit[1]);
						if (potentialYear.length > 0){
							eles.push(potentialYear);
						}
					}
				}
	
				// An 8 digit number is assumed as being YMD
				if (stillLooking && chunk.match(/^([0-9]{8})$/)){
					stillLooking = false;
					eles = [chunk.substr(6,2), chunk.substr(4,2), chunk.substr(0,4)];
				}
	
				// A 4 digit is DM
				if (stillLooking && chunk.match(/^([0-9]{4})$/)){
					stillLooking = false;
					eles = [chunk.substr(0,2),chunk.substr(2,2)];
				}
	
			} 

			if (eles.length === 2){
				// Current year is 3rd ele
				eles.push(String(moment().year()));
			} 

			if (eles.length !== 3){
				return new Error('Unable to interpret "'+str+'" as a date');
			}

			// Loop 3 times, getting more prescriptive each iteration
			for (var k = 0; k < 3; k++){
	
				while (true){
					var anyResolved = false;
					for (var j = 0; j < eles.length; j++){
			
						if (eles[j]){
			
							var pos = {d:date.d===0,m:date.m===0,y:date.y===0};
			
							if (k === 1){
								// Guess based on element order
					
								if (j === 2){
									pos.d = false;
									pos.m = false;
								} else {
									pos.y = false;
								}
					
							} else if (k === 2){
								if (j === 0){
									pos.m = false;
									pos.y = false;
								} else if (j === 1){
									pos.d = false;
									pos.y = false;
								} else if (j === 2){
									pos.d = false;
									pos.m = false;
								}
							}
		
							var result = _date.interpretDateElement(eles[j],pos.d,pos.m, pos.y);
							if (result.resolved){
								anyResolved = true;
								date[result.type] = result.value;
								eles[j] = null;
							}
						}
					}
					if (!anyResolved){
						break;
					}
				}
				if (date.d > 0 && date.m > 0 && date.y > 0){
					var newValue = moment(String(date.d)+'-'+String(date.m)+'-'+String(date.y), 'DD'.substr(0,String(date.d).length) + '-' + 'MM'.substr(0,String(date.m).length) + '-YYYY');
					if (!newValue.isValid()){
						return new Error('Invalid date "'+String(date.d)+'-'+String(date.m)+'-'+String(date.y) + '"');
					}
					value = newValue;
					return; 
				}
			}

			// Loop through each ele - seeing if each can be determined as a day, month or year

			// Failed to parse
			return new Error('Unable to interpret "'+str+'" as a date');
		
		},
		
		isSet: function(){
			
			return value !== null;
			
		},
		
		isEmpty: function(){
			
			return !this.isSet();
			
		},
		
		readable: function(){
			if (!this.isSet()){
				return '';
			}
			return value.format('dddd MMMM Do YYYY');

		}, 
		
		inputHelp: function(){
	
			return 'Enter a date. Eg "today", "yesterday", "23/12", "20141225", "4May10", "2312", "5/5/99", 31February1918", "3jun", "24 June 2015", "5th Sep", "2014-12-32", "2014 12 32", "31/12/1999"';

		},
		
	};
	
};

_date.interpretDateElement = function(str, possibleDay, possibleMonth, possibleYear){

	// 'd','m','y'

	var i, num;
	if (possibleMonth){
		// Check for a month name
		for (i = 0; i < MONTHS.length; i++){
			if (str.substr(0, MONTHS[i].length) === MONTHS[i]){
				return {type:'m', resolved:true, value:i+1};
			}
		}
	}

	if (possibleDay){
		for (i = 0 ; i < DAY_SUFFIXES.length; i++){
			if (str.substr(-DAY_SUFFIXES[i].length) === DAY_SUFFIXES[i]){
				str = str.substr(0, str.length - DAY_SUFFIXES[i].length);
				num = Number(str);
				if (!isNaN(num) && num > 0 && num <= 31){
					num = Math.round(num);
					return {type:'d', resolved:true, value:num};
				}
			}
		}
	}

	// 4 digit year
	if (possibleYear){
		num = Number(str);
		if (!isNaN(num) && num > 1900 && num <= 9999){ 
			num = Math.round(num);
			return {type:'y', resolved:true, value:num};
		}
	}

	// Day specific range
	if (possibleDay && !possibleYear){
		num = Number(str);
		if (!isNaN(num) && num > 12 && num <= 31){ 
			num = Math.round(num);
			return {type:'d', resolved:true, value:num};
		}
	}

	// Year only (2 digits)
	if (possibleYear && !possibleDay && !possibleMonth){
		num = Number(str);
		if (!isNaN(num) && num >= 0 && num <= 99){ 
			num = Math.round(num);
			if (num > 50){
				num += 1900;
			} else {
				num += 2000;
			}
			return {type:'y', resolved:true, value:num};
		}
	}

	// Month only
	if (possibleMonth && !possibleDay && !possibleYear){
		num = Number(str);
		if (!isNaN(num) && num >= 1 && num <= 12){ 
			num = Math.round(num);
			return {type:'m', resolved:true, value:num};
		}
	}

	// Day only
	if (possibleDay && !possibleMonth && !possibleYear){
		num = Number(str);
		if (!isNaN(num) && num >= 1 && num <= 31){ 
			num = Math.round(num);
			return {type:'d', resolved:true, value:num};
		}
	}

	return {resolved:false};

};


