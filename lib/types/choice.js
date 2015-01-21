
var fs = require('fs');
var path = require('path'); 
var utils = require('../utils.js');

// |configObj| can contain a prop:
// - choices 
var choice = module.exports = function(){
	
	var choices;
	var inputHelpText; 
	var value = null;
	//var chosenLabel = '';

	return {
		
		config: function(config){
			//chosenLabel = '';
			choices = {};
			if (config && config.choices){
				this.setChoices(config.choices, config.choiceLabelKeys);
			}
		},
		
		getValue : function(){
			
			return value;
			
		},
		
		setValue : function(obj){
			
			if (!obj){
				return;
			}
			
			var str = utils.trim(String(obj)).toLowerCase();
			
			// Look up by label
			var p;
			for (p in choices){
				if (str === utils.trim(choices[p].label).toLowerCase()){
					value = choices[p].choice;
					//chosenLabel = choices[p].label;
					return;
				}
			}
			
			// Look up by slug
			for (p in choices){
				var shortlookup = choices[p].lookupshort;
				if (str.substr(0, shortlookup.length) === shortlookup){
					value = choices[p].choice;
					return;
				}
			}
			
			return new Error('Cannot match \"'+str+'\" to choice');
		
		},
		
		isSet: function(){
			
			return value !== null;
			
		},
		
		isEmpty: function(){
			
			return !this.isSet();
			
		},
		
		readable: function(){

			return this.isSet() ? choices[this.getValue()].label : '';

		}, 
		
		getObject : function(){
			
			return choices[this.getValue()].obj;
			
		},
		
		inputHelp: function(){
	
			return inputHelpText;

		},
		
		// Accepts: 
		// |obj| {slug: label, slug: label} or 
		// |obj| {slug: obj} and |labelKey|
		setChoices: function(obj, labelKeys){
			
			if (utils.isStr(labelKeys)){
				labelKeys = [labelKeys];
			}
		
			var tmp = {};
			var p;
			var i;
			for (p in obj){
				var lookup = p.toLowerCase().replace(/[^0-9a-z\-]/g, '');
				var lookupShort = lookup.charAt(0);
				if (tmp[lookupShort] === undefined){
					tmp[lookupShort] = [];
				}
				var label;
				if (utils.isStr(obj[p])){
					label = obj[p];
				} else if (labelKeys){
					for (i = 0; i < labelKeys.length; i++){
						if (obj[p][labelKeys[i]] !== undefined){
							label = obj[p][labelKeys[i]];
							break;
						}
					} 
				}
				if (!utils.isSet(label)){
					label = lookup;
				}
				tmp[lookupShort].push({label:label, choice:p, lookup:lookup, lookupShort:lookupShort, obj:obj[p]});
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
					var lookupshort = tmp[p][i].lookupShort;
					var ch = choices[tmp[p][i].choice] = {choice:tmp[p][i].choice, lookupshort:lookupshort, label:tmp[p][i].label, obj:obj[tmp[p][i].choice]};
					inputHelpText += '\n(' + lookupshort + ')' + ch.choice.substr(lookupshort.length) + ' \"' + ch.label + '\"';
				}
			}
		}
	};
};