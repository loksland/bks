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

You will be asked if you want to customise the directory names or add sample data if the 
data dir is empty.

**Updates**

You will be informed when an updated version of bks is available.

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

Proposed commands
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
bks >> new job
```
Create a new job

```bash
bks >> list jobs
```
Lists all active jobs

Code structure
--------------

- bks.js  
Handles first run and update notification, passes commands and config to libs that do the 
work.

