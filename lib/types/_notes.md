
setValue
--------
- Should accept native type (eg. a .value of an identical type), 
- Should accept flexible string input
- Should accept |readable()|
- Should accept native type. Eg. Number for currency
- If validation fails then it should resolve to pre-existing value
- You should be able to set the value to null without throwing an error

readable
--------
- Returns string that can be interpreted by |setValue|
- If empty then should return an empty data type when passed to |setValue|