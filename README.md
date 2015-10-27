bks
===

Installation
------------

Install bks
```bash
$ npm install bks -g
```

Getting started
---------------

```bash
$ bks
```

**First run**

You will be prompted for a path to the data directory. Best to point this to a private 
repository.

Data structure
--------------

- (User dir)/.bksconfig

Contains only one field: `dataDir` wich points to where the data is.

**Data directory**

- config.yml  
Includes naming conventions with a warning about being careful when changing.
All default / short code data goes in here, though once a transaction is created it will
not rely on any data from this file.
- jobs
	- %JOBNUM% Job title
- io
  - YYY
    - in
    - out

Commands
-----------------

*Bks runs in an interactive shell*

```bash
bks >> help
```
Lists all main commands

```bash
bks >> move
```
Change the data directory location

```bash
bks >> new out
```
Create a new expense

```bash
bks >> new in
```
Create a new income record

```bash
bks >> bas
```
Output a BAS statement

```bash
bks >> scour
```
Scour bank statements for income / outgoings

### Release History ###

- v0.2.1 - Export tax return as .xlsx file
- v0.1.9 - Allow ':X' input on boolean skip input
- v0.1.8 - Fix GST calculation error
- v0.1.7 - Scour formatting
- v0.1.6 - Scour improvements
- v0.1.1 - Initial release

### Planned features ###

- In tax return, highlight capital purchase line items

