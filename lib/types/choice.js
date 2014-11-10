
var fs = require('fs');
var path = require('path'); 
var utils = require('../utils.js');

var value;
var choices;
var inputHelpText; 
var chosenLabel;

var choice = module.exports = function(){
	
	chosenLabel = '';
	choices = [];
		
};

choice.prototype.getValue = function(){

	return value;
	
};

choice.prototype.setValue = function(str){
	
	var saveInput = str;
	
	chosenLabel = '';
	value = null;
	
	if (!str){	
		return;
	} 
	
	str = utils.trim(String(str)).toLowerCase();
	
	for (var p in choices){
		if (str.substr(0, p.length) === p){
			value = choices[p].choice;
			chosenLabel = choices[p].label;
			break;
		}
	}
	
	if (!value){
		return new Error('Cannot match \"'+saveInput+'\" to choice');
	}
	
};

choice.prototype.isEmpty = function(){
	return !Boolean(value);
};

choice.prototype.readable = function(){
	return chosenLabel;
};

choice.prototype.inputHelp = function(){
	return inputHelpText;
};

// An object of choice:label fields
choice.prototype.setChoices = function(obj){
	
	var tmp = {};
	var p;
	var i;
	for (p in obj){
		var lookup = p.toLowerCase().replace(/[^0-9a-z]/g, '');
		var lookupShort = lookup.charAt(0);
		if (tmp[lookupShort] === undefined){
			tmp[lookupShort] = [];
		}
		tmp[lookupShort].push({label:obj[p], choice:p, lookup:lookup, lookupShort:lookupShort});
	}
	
	for (p in tmp){
		if (tmp[p].length > 1){
			// We have an array of conflicts
			var conflicted = tmp[p];
			// Get longest lookup of conflicted
			var longestLookupLength = 0;
			for (i = 0; i < conflicted.length; i++){
				if (longestLookupLength === 0 || conflicted[i].lookup.length > longestLookupLength){
					longestLookupLength = conflicted[i].lookup.length;
				}
			}
			// Now keep adding chars from lookout to lookupShort until none match
			for (var c = 2; c <= longestLookupLength; c++){
				var lookupShortTmp = {};
				for (i = 0; i < conflicted.length; i++){
					if (!conflicted[i].lockin){
						if (conflicted[i].lookup.length >= c){
							conflicted[i].lookupShort = conflicted[i].lookup.substr(0, c);
						}
						if (lookupShortTmp[conflicted[i].lookupShort] === undefined){
							lookupShortTmp[conflicted[i].lookupShort] = [];
						}
						lookupShortTmp[conflicted[i].lookupShort].push(i);
					}
				}
				var stillConflicts = false;
				for (var q in lookupShortTmp){
					if (lookupShortTmp[q].length > 1){
						stillConflicts = true;
					} else {
						conflicted[lookupShortTmp[q][0]].lockin = true;
					}
				}
				if (!stillConflicts){
					break;
				}
			}
		}
	}
	
	choices = {};
	inputHelpText = 'Choose one of the following:';
	for (p in tmp){
		for (i = 0; i < tmp[p].length; i++){
			var ch = choices[tmp[p][i].lookupShort] = {choice:tmp[p][i].choice, label:tmp[p][i].label};
			var lookupshort = tmp[p][i].lookupShort;
			inputHelpText += '\n(' + lookupshort + ')' + ch.choice.substr(lookupshort.length) + ' \"'+ch.label+'\"';
		}
	}
	
};
