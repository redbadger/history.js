// History.js
// New-BSD License, Copyright 2010-2011 Benjamin Arthur Lupton <contact@balupton.com>

(function(window,undefined){

	// --------------------------------------------------------------------------
	// Initialise

	// History Object
	window.History = window.History||{};

	// Localise Globals
	var
		console = window.console||undefined, // Prevent a JSLint complain
		document = window.document, // Make sure we are using the correct document
		_History = {}, // Private History Object
		History = window.History, // Public History Object
		history = window.history; // Old History Object

	// Check Existence of History.js
	if ( typeof History.emulated !== 'undefined' ) {
		throw new Error('History.js has already been emulated...');
	}

	// Initialise
	History.init = function(){

		// ----------------------------------------------------------------------
		// Debug Helpers

		/**
		 * History.options
		 * Configurable options
		 */
		History.options = {
			/**
			 * History.options.hashChangeCheckerDelay
			 * How long should the interval be before hashchange checks
			 */
			hashChangeCheckerDelay: 100,
			/**
			 * History.options.busyDelay
			 * How long should we wait between busy events
			 */
			busyDelay: 250
		};

		// ----------------------------------------------------------------------
		// Debug Helpers

		/**
		 * History.debug(message,...)
		 * Logs the passed arguments if debug enabled
		 */
		History.debug = function(){
			if ( (History.debug.enable||false) ) {
				History.log.apply(History,arguments);
			}
		};
		History.debug.enable = false;

		/**
		 * History.log(message,...)
		 * Logs the passed arguments
		 */
		History.log = function(){
			// Prepare
			var
				consoleExists = (typeof console !== 'undefined'),
				textarea = document.getElementById('log'),
				message = ("\n"+arguments[0]+"\n"),
				i
				;

			// Write to Console
			if ( consoleExists ) {
				var
					args = Array.prototype.slice.call(arguments),
					message = args.shift();
				if ( typeof console.debug !== 'undefined' ) {
					console.debug.apply(console,[message,args]);
				}
				else {
					console.log.apply(console,[message,args]);
				}
			}

			// Write to log
			for ( i=1,n=arguments.length; i<n; ++i ) {
				var arg = arguments[i];
				if ( typeof arg === 'object' && typeof JSON !== 'undefined' ) {
					try {
						arg = JSON.stringify(arg);
					}
					catch ( Exception ) {
						// Recursive Object
					}
				}
				message += "\n"+arg+"\n";
			}

			// Textarea
			if ( textarea ) {
				textarea.value += message+"\n-----\n";
				textarea.scrollTop = textarea.scrollHeight - textarea.clientHeight;
			}
			// No Textarea, No Console
			else if ( !consoleExists ) {
				alert(message);
			}

			// Return true
			return true;
		};

		// ----------------------------------------------------------------------
		// Emulated Status

		/**
		 * _History.getInternetExplorerMajorVersion()
		 * Get's the major version of Internet Explorer
		 * @return {integer}
		 * @license Public Domain
		 * @author Benjamin Lupton <contact@balupton.com>
		 * @author James Padolsey <https://gist.github.com/527683>
		 */
		_History.getInternetExplorerMajorVersion = function(){
			var result = _History.getInternetExplorerMajorVersion.cached =
					(typeof _History.getInternetExplorerMajorVersion.cached !== 'undefined')
				?	_History.getInternetExplorerMajorVersion.cached
				:	(function(){
						var undef,
								v = 3,
								div = document.createElement('div'),
								all = div.getElementsByTagName('i');
						while (
								div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->',
								all[0]
						);
						return v > 4 ? v : undef;
					})()
				;
			return result;
		};

		/**
		 * _History.isInternetExplorer()
		 * Are we using Internet Explorer?
		 * @return {boolean}
		 * @license Public Domain
		 * @author Benjamin Lupton <contact@balupton.com>
		 */
		_History.isInternetExplorer = function(){
			var result = _History.isInternetExplorer.cached =
					(typeof _History.isInternetExplorer.cached !== 'undefined')
				?	_History.isInternetExplorer.cached
				:	(_History.getInternetExplorerMajorVersion() !== 0)
				;
			return result;
		};

		/**
		 * History.emulated
		 * Which features require emulating?
		 */
		History.emulated = {
			pushState: !Boolean(window.history && window.history.pushState && window.history.replaceState),
			hashChange: Boolean(
				!('onhashchange' in window || 'onhashchange' in document)
				||
				(_History.isInternetExplorer() && _History.getInternetExplorerMajorVersion() < 8)
			)
		};

		/**
		 * _History.isEmptyObject(obj)
		 * Checks to see if the Object is Empty
		 * @param {Object} obj
		 * @return {boolean}
		 */
		_History.isEmptyObject = function(obj) {
			for ( var key in obj ) {
				if ( !this.hasOwnProperty(key) ) {
					continue;
				}
				return false;
			}
			return true;
		};

		/**
		 * _History.cloneObject(obj)
		 * Clones a object
		 * @param {Object} obj
		 * @return {Object}
		 */
		_History.cloneObject = function(obj) {
			var hash,newObj;
			if ( obj ) {
				hash = JSON.stringify(obj);
				newObj = JSON.parse(hash);
			}
			else {
				newObj = {};
			}
			return newObj;
		};


		// ----------------------------------------------------------------------
		// Hash Helpers

		/**
		 * History.setHash(hash)
		 * Sets the document hash
		 * @param {string} hash
		 * @return {string}
		 */
		History.setHash = function(hash,queue){
			// Handle Queueing
			if ( queue !== false && History.busy() ) {
				// Wait + Push to Queue
				History.debug('History.setHash: we must wait', arguments);
				History.pushQueue({
					scope: History,
					callback: History.setHash,
					args: arguments,
					queue: queue
				});
				return false;
			}

			// Prepare
			var adjustedHash = _History.escapeHash(hash);

			// Log hash
			History.debug('History.setHash',this,arguments,'hash:',hash,'adjustedHash:',adjustedHash,'oldHash:',document.location.hash);

			// Make Busy + Continue
			History.busy(true);

			// Apply hash
			document.location.hash = adjustedHash;

			// Return hash
			return hash;
		};

		/**
		 * History.getHash()
		 * Gets the current document hash
		 * @return {string}
		 */
		History.getHash = function(){
			var hash = _History.unescapeHash(document.location.hash);
			return hash;
		};

		/**
		 * _History.escape()
		 * Normalise and Escape a Hash
		 * @return {string}
		 */
		_History.escapeHash = function(hash){
			var result = _History.normalizeHash(hash);

			// Escape hash
			if ( /[^a-zA-Z0-9\/\-\_\%\.]/.test(result) ) {
				result = escape(result);
			}

			// Return result
			return result;
		};

		/**
		 * _History.unescapeHash()
		 * Normalise and Unescape a Hash
		 * @return {string}
		 */
		_History.unescapeHash = function(hash){
			var result = _History.normalizeHash(hash);

			// Unescape hash
			if ( /[\%]/.test(result) ) {
				result = unescape(result);
			}

			// Return result
			return result;
		};

		/**
		 * _History.normalizeHash()
		 * Normalise a hash across browsers
		 * @return {string}
		 */
		_History.normalizeHash = function(hash){
			var result = hash.replace(/[^#]*#/,'').replace(/#.*/, '');

			// Return result
			return result;
		};

		/**
		 * History.extractHashFromUrl(url)
		 * Extracts the Hash from a URL
		 * @param {string} url
		 * @return {string} url
		 */
		History.extractHashFromUrl = function(url){
			// Extract the hash
			var hash = String(url)
				.replace(/([^#]*)#?([^#]*)#?(.*)/, '$2')
				;

			// Unescape hash
			hash = _History.unescapeHash(hash);

			// Return hash
			return hash;
		};

		/**
		 * History.isTraditionalAnchor(url)
		 * Checks to see if the url is a traditional anchor
		 * @param {string} url
		 * @return {boolean}
		 */
		History.isTraditionalAnchor = function(url){
			var
				hash = History.extractHashFromUrl(url),
				el = document.getElementById(hash),
				exists = typeof el !== 'undefined';

			return exists;
		};

		// ----------------------------------------------------------------------
		// State Object Helpers

		/**
		 * History.contractUrl(url)
		 * Ensures that we have a relative URL and not a absolute URL
		 * @param {string} url
		 * @return {string} url
		 */
		History.contractUrl = function(url){
			// Prepare
			url = History.expandUrl(url);

			// Prepare for Base Domain
			var baseDomain = document.location.protocol+'//'+(document.location.hostname||document.location.host);
			if ( document.location.port||false ) {
				baseDomain += ':'+document.location.port;
			}
			baseDomain += '/';

			// Adjust for Base Domain
			url = url.replace(baseDomain,'/');

			// Return url
			return url;
		};

		/**
		 * History.expandUrl(url)
		 * Ensures that we have an absolute URL and not a relative URL
		 * @param {string} url
		 * @return {string} url
		 */
		History.expandUrl = function(url){
			// Prepare
			url = url||'';

			// Test for Full URL
			if ( /[a-z]+\:\/\//.test(url) ) {
				// We have a Full URL
			}

			// Relative URL
			else {
				// Test for Base Page
				if ( url.length === 0 || url.substring(0,1) === '?' ) {
					// Fetch Base Page
					var basePage = document.location.href.replace(/[#\?].*/,'');

					// Adjust Page
					url = basePage+url;
				}

				// No Base Page
				else {

					// Prepare for Base Element
					var
						baseElements = document.getElementsByTagName('base'),
						baseElement = null,
						baseHref = '';

					// Test for Base Element
					if ( baseElements.length === 1 ) {
						// Prepare for Base Element
						baseElement = baseElements[0];
						baseHref = baseElement.href;
						if ( baseHref[baseHref.length-1] !== '/' ) baseHref += '/';

						// Adjust for Base Element
						url = baseHref+url.replace(/^\//,'');
					}

					// No Base Element
					else {
						// Test for Base URL
						if ( url.substring(0,1) === '.' ) {
							// Prepare for Base URL
							var baseUrl = document.location.href.replace(/[#\?].*/,'').replace(/[^\/]+$/,'');
							if ( baseUrl[baseUrl.length-1] !== '/' ) baseUrl += '/';

							// Adjust for Base URL
							url = baseUrl + url;
						}

						// No Base URL
						else {
							// Prepare for Base Domain
							var baseDomain = document.location.protocol+'//'+(document.location.hostname||document.location.host);
							if ( document.location.port||false ) {
								baseDomain += ':'+document.location.port;
							}
							baseDomain += '/';

							// Adjust for Base Domain
							url = baseDomain+url.replace(/^\//,'');
						}
					}
				}
			}

			// Return url
			return url;
		};

		/**
		 * History.expandState(State)
		 * Expands a State Object
		 * @param {object} State
		 * @return {object}
		 */
		History.expandState = function(oldState){
			oldState = oldState||{};
			var newState = {
				'data': oldState.data||{},
				'url': History.expandUrl(oldState.url||''),
				'title': oldState.title||''
			};
			newState.data.title = newState.data.title||newState.title;
			newState.data.url = newState.data.url||newState.url;
			return newState;
		};

		/**
		 * History.createStateObject(data,title,url)
		 * Creates a object based on the data, title and url state params
		 * @param {object} data
		 * @param {string} title
		 * @param {string} url
		 * @return {object}
		 */
		History.createStateObject = function(data,title,url){
			// Hashify
			var State = {
				"data": data,
				"title": title,
				"url": url
			};

			// Expand the State
			State = History.expandState(State);

			// Return object
			return State;
		};

		/**
		 * History.expandHash(hash)
		 * Expands a Hash into a StateHash if applicable
		 * @param {string} hash
		 * @return {Object|null} State
		 */
		History.expandHash = function(hash){
			// Prepare
			var State = null;

			// JSON
			try {
				State = JSON.parse(hash);
			}
			catch ( Exception ) {
				var
					parts = /(.*)\/uid=([0-9]+)$/.exec(hash),
					url = parts ? (parts[1]||hash) : hash,
					uid = parts ? String(parts[2]||'') : '';

				if ( uid ) {
					State = _History.getStateByUid(uid)||null;
				}

				if ( !State && /\//.test(hash) ) {
					// Is a URL
					var expandedUrl = History.expandUrl(hash);
					State = History.createStateObject(null,null,expandedUrl);
				}
				else {
					// Non State Hash
					// do nothing
				}
			}

			// Expand
			State = State ? History.expandState(State) : null;

			// Return State
			return State;
		};

		/**
		 * History.contractState(State)
		 * Creates a Hash for the State Object
		 * @param {object} passedState
		 * @return {string} hash
		 */
		History.contractState = function(passedState){
			// Check
			if ( !passedState ) {
				return null;
			}

			// Prepare
			var
				hash = null,
				State = _History.cloneObject(passedState);

			// Ensure State
			if ( State ) {
				// Clean
				State.data = State.data||{};
				delete State.data.title;
				delete State.data.url;

				// Handle
				if ( _History.isEmptyObject(State) && !State.title ) {
					hash = History.contractUrl(State.url);
				}
				else {
					// Serialised Hash
					hash = JSON.stringify(State);

					// Has it been associated with a UID?
					var uid;
					if ( typeof _History.hashesToUids[hash] !== 'undefined' ) {
						uid = _History.hashesToUids[hash];
					}
					else {
						while ( true ) {
							uid = String(Math.floor(Math.random()*1000));
							if ( typeof _History.uidsToStates[uid] === 'undefined' ) {
								break;
							}
						}
					}

					// Associate UID with Hash
					_History.hashesToUids[hash] = uid;
					_History.uidsToStates[uid] = State;

					// Simplified Hash
					hash = History.contractUrl(State.url)+'/uid='+uid;
				}
			}

			// Return hash
			return hash;
		};

		/**
		 * _History.uidsToStates
		 * UIDs to States
		 */
		_History.uidsToStates = {};

		/**
		 * _History.hashesToUids
		 * Serialised States to UIDs
		 */
		_History.hashesToUids = {};

		/**
		 * _History.getStateByUid(uid)
		 * Get a state by it's UID
		 * @param {string} uid
		 */
		_History.getStateByUid = function(uid){
			uid = String(uid);
			var State = _History.uidsToStates[uid]||undefined;
			return State;
		};


		// ----------------------------------------------------------------------
		// State Logging

		/**
		 * _History.statesByUrl
		 * Store the states indexed by their URLs
		 */
		_History.statesByUrl = {};

		/**
		 * _History.duplicateStateUrls
		 * Which urls have duplicate states (indexed by url)
		 */
		_History.duplicateStateUrls = {};

		/**
		 * _History.statesByHash
		 * Store the states indexed by their Hashes
		 */
		_History.statesByHash = {};

		/**
		 * _History.savedStates
		 * Store the states in an array
		 */
		_History.savedStates = [];

		/**
		 * History.getState()
		 * Get an object containing the data, title and url of the current state
		 * @return {Object} State
		 */
		History.getState = function(){
			return _History.getStateByIndex();
		};

		/**
		 * History.getStateHash()
		 * Get the hash of the current state
		 * @return {string} hash
		 */
		History.getStateHash = function(){
			return History.contractState(History.getState());
		};

		/**
		 * _History.getStateByUrl
		 * Get a state by it's url
		 * @param {string} stateUrl
		 */
		_History.getStateByUrl = function(stateUrl){
			var State = _History.statesByUrl[stateUrl]||undefined;
			return State;
		};

		/**
		 * _History.getStateByHash
		 * Get a state by it's hash
		 * @param {string} stateHash
		 */
		_History.getStateByHash = function(stateHash){
			var State = _History.statesByHash[stateHash]||undefined;
			return State;
		};

		/**
		 * _History.storeState
		 * Store a State
		 * @param {object} State
		 * @return {boolean} true
		 */
		_History.storeState = function(newState){
			// Prepare
			var
				newStateHash = History.contractState(newState),
				oldState = _History.getStateByUrl(newState.url);

			// Check for Conflict
			if ( typeof oldState !== 'undefined' ) {
				// Compare Hashes
				var oldStateHash = History.contractState(oldState);
				if ( oldStateHash !== newStateHash ) {
					// We have a conflict
					_History.duplicateStateUrls[newState.url] = true;
				}
			}

			// Store the State
			_History.statesByUrl[newState.url] = _History.statesByHash[newStateHash] = newState;

			// Return true
			return true;
		};

		/**
		 * _History.isLastState(newState)
		 * Tests to see if the state is the last state
		 * @param {Object} newState
		 * @return {boolean} isLast
		 */
		_History.isLastState = function(newState){
			// Prepare
			var
				newStateHash = History.contractState(newState),
				oldStateHash = History.getStateHash();

			// Check
			var isLast = _History.savedStates.length && newStateHash === oldStateHash;

			// Return isLast
			return isLast;
		};

		/**
		 * _History.saveState
		 * Push a State
		 * @param {Object} newState
		 * @return {boolean} changed
		 */
		_History.saveState = function(newState){
			// Check Hash
			if ( _History.isLastState(newState) ) {
				return false;
			}

			// Push the State
			_History.savedStates.push(newState);

			// Return true
			return true;
		};

		/**
		 * _History.getStateByIndex()
		 * Gets a state by the index
		 * @param {integer} index
		 * @return {Object}
		 */
		_History.getStateByIndex = function(index){
			// Prepare
			var State = null;

			// Handle
			if ( typeof index === 'undefined' ) {
				// Get the last inserted
				State = _History.savedStates[_History.savedStates.length-1];
			}
			else if ( index < 0 ) {
				// Get from the end
				State = _History.savedStates[_History.savedStates.length+index];
			}
			else {
				// Get from the beginning
				State = _History.savedStates[index];
			}

			// Return State
			return State;
		};

		/**
		 * _History.stateUrlExists
		 * Checks if the State Url Exists
		 * @param {string} stateUrl
		 * @return {boolean} exists
		 */
		_History.stateUrlExists = function(stateUrl){
			// Prepare
			var exists = typeof _History.statesByUrl[stateUrl] !== 'undefined';

			// Return exists
			return exists;
		};

		/**
		 * _History.urlDuplicateExists
		 * Check if the url has multiple states associated to it
		 * @param {string} stateUrl
		 * @return {boolean} exists
		 */
		_History.urlDuplicateExists = function(stateUrl){
			var exists = typeof _History.duplicateStateUrls[stateUrl] !== 'undefined';
			return exists;
		};

		// ----------------------------------------------------------------------
		// Hash Logging

		/**
		 * _History.savedHashes
		 * Store the hashes in an array
		 */
		_History.savedHashes = [];

		/**
		 * _History.isLastHash(newHash)
		 * Checks if the hash is the last hash
		 * @param {string} newHash
		 * @return {boolean} true
		 */
		_History.isLastHash = function(newHash){
			// Prepare
			var oldHash = _History.getHashByIndex();

			// Check
			var isLast = newHash === oldHash;

			// Return isLast
			return isLast;
		};

		/**
		 * _History.saveHash(newHash)
		 * Push a Hash
		 * @param {string} newHash
		 * @return {boolean} true
		 */
		_History.saveHash = function(newHash){
			// Check Hash
			if ( _History.isLastHash(newHash) ) {
				return false;
			}

			// Push the Hash
			_History.savedHashes.push(newHash);

			// Return true
			return true;
		};

		/**
		 * _History.getHashByIndex()
		 * Gets a hash by the index
		 * @param {integer} index
		 * @return {string}
		 */
		_History.getHashByIndex = function(index){
			// Prepare
			var hash = null;

			// Handle
			if ( typeof index === 'undefined' ) {
				// Get the last inserted
				hash = _History.savedHashes[_History.savedHashes.length-1];
			}
			else if ( index < 0 ) {
				// Get from the end
				hash = _History.savedHashes[_History.savedHashes.length+index];
			}
			else {
				// Get from the beginning
				hash = _History.savedHashes[index];
			}

			// Return hash
			return hash;
		};

		/**
		 * _History.stateHashExists
		 * Checks if the State Hash Exists
		 * @param {string} stateHash
		 * @return {boolean} exists
		 */
		_History.stateHashExists = function(stateHash){
			// Prepare
			var exists = typeof _History.statesByHash[stateHash] !== 'undefined';

			// Return exists
			return exists;
		};


		// ----------------------------------------------------------------------
		// Discarded States

		/**
		 * _History.discardedHashes
		 * A hashed array of discarded hashes
		 */
		_History.discardedHashes = {};

		/**
		 * _History.discardedStates
		 * A hashed array of discarded states
		 */
		_History.discardedStates = {};

		/**
		 * _History.discardState(State)
		 * Discards the state by ignoring it through History
		 * @param {object} State
		 * @return {true}
		 */
		_History.discardState = function(discardedState,forwardState,backState){
			History.debug('History.discardState',this,arguments);
			// Prepare
			var discardedStateHash = History.contractState(discardedState);

			// Create Discard Object
			var discardObject = {
				'discardedState': discardedState,
				'backState': backState,
				'forwardState': forwardState
			};

			// Add to DiscardedStates
			_History.discardedStates[discardedStateHash] = discardObject;

			// Return true
			return true;
		};

		/**
		 * _History.discardHash(hash)
		 * Discards the hash by ignoring it through History
		 * @param {string} hash
		 * @return {true}
		 */
		_History.discardHash = function(discardedHash,forwardState,backState){
			History.debug('History.discardState',this,arguments);
			// Create Discard Object
			var discardObject = {
				'discardedHash': discardedHash,
				'backState': backState,
				'forwardState': forwardState
			};

			// Add to discardedHash
			_History.discardedHashes[discardedHash] = discardObject;

			// Return true
			return true;
		};

		/**
		 * _History.discardState(State)
		 * Checks to see if the state is discarded
		 * @param {object} State
		 * @return {bool}
		 */
		_History.discardedState = function(State){
			// Prepare
			var StateHash = History.contractState(State);

			// Check
			var discarded = _History.discardedStates[StateHash]||false;

			// Return true
			return discarded;
		};

		/**
		 * _History.discardedHash(hash)
		 * Checks to see if the state is discarded
		 * @param {string} State
		 * @return {bool}
		 */
		_History.discardedHash = function(hash){
			// Check
			var discarded = _History.discardedHashes[hash]||false;

			// Return true
			return discarded;
		};

		/**
		 * _History.recycleState(State)
		 * Allows a discarded state to be used again
		 * @param {object} data
		 * @param {string} title
		 * @param {string} url
		 * @return {true}
		 */
		_History.recycleState = function(State){
			History.debug('History.recycleState',this,arguments);
			// Prepare
			var StateHash = History.contractState(State);

			// Remove from DiscardedStates
			if ( _History.discardedState(State) ) {
				delete _History.discardedStates[StateHash];
			}

			// Return true
			return true;
		};


		// ----------------------------------------------------------------------
		// Queueing

		/**
		 * History.queues
		 * The list of queues to use
		 * First In, First Out
		 */
		History.queues = [];

		/**
		 * History.busy(value)
		 * @param {boolean} value [optional]
		 * @return {boolean} busy
		 */
		History.busy = function(value){
			History.debug('History.busy: called: changing ['+(History.busy.flag||false)+'] to ['+(value||false)+']', History.queues);

			// Apply
			if ( typeof value !== 'undefined' ) {
				History.busy.flag = value;
			}
			// Default
			else if ( typeof History.busy.flag === 'undefined' ) {
				History.busy.flag = false;
			}

			// Queue
			if ( !History.busy.flag ) {
				// Execute the next item in the queue
				clearTimeout(History.busy.timeout);
				var fireNext = function(){
					if ( History.busy.flag ) return;
					for ( var i=History.queues.length-1; i >= 0; --i ) {
						var queue = History.queues[i];
						if ( queue.length === 0 ) continue;
						var item = queue.shift();
						History.debug('History.busy: firing', item);
						History.fireQueueItem(item);
						History.busy.timeout = setTimeout(fireNext,History.options.busyDelay);
					}
				};
				History.busy.timeout = setTimeout(fireNext,History.options.busyDelay);
			}

			// Return
			return History.busy.flag;
		};

		/**
		 * History.fireQueueItem(item)
		 * Fire a Queue Item
		 * @param {Object} item
		 * @return {Mixed} result
		 */
		History.fireQueueItem = function(item){
			return item.callback.apply(item.scope||History,item.args||[]);
		};

		/**
		 * History.pushQueue(callback,args)
		 * Add an item to the queue
		 * @param {Object} item [scope,callback,args,queue]
		 */
		History.pushQueue = function(item){
			History.debug('History.pushQueue: called', arguments);

			// Prepare the queue
			History.queues[item.queue||0] = History.queues[item.queue||0]||[];

			// Add to the queue
			History.queues[item.queue||0].push(item);

			// End pushQueue closure
			return true;
		};

		/**
		 * History.queue (item,queue), (func,queue), (func), (item)
		 * Either firs the item now if not busy, or adds it to the queue
		 */
		History.queue = function(item,queue){
			// Prepare
			if ( typeof item === 'function' ) {
				item = {
					callback: item
				};
			}
			if ( typeof queue !== 'undefined' ) {
				item.queue = queue;
			}

			// Handle
			if ( History.busy() ) {
				History.pushQueue(item);
			} else {
				History.fireQueueItem(item);
			}

			// End queue closure
			return true;
		};

		// ----------------------------------------------------------------------
		// HTML4 State Aliases

		/**
		 * History.back(queue)
		 * Send the browser history back one item
		 * @param {Integer} queue [optional]
		 */
		History.back = function(queue){
			History.debug('History.back: called', arguments);

			// Handle Queueing
			if ( queue !== false && History.busy() ) {
				// Wait + Push to Queue
				History.debug('History.back: we must wait', arguments);
				History.pushQueue({
					scope: History,
					callback: History.back,
					args: arguments,
					queue: queue
				});
				return false;
			}

			// Make Busy + Continue
			History.busy(true);

			// Fix a bug in IE6,IE7
			if ( History.emulated.hashChange && _History.isInternetExplorer() ) {
				// Prepare
				var currentHash = History.getHash();

				// Apply Check
				setTimeout(function(){
					var newHash = History.getHash();
					if ( newHash === currentHash ) {
						// No change occurred, try again
						History.debug('History.back: trying again');
						return History.back(false);
					}
					return true;
				},History.options.hashChangeCheckerDelay*5);
			}

			// Go back
			history.go(-1);

			// End back closure
			return true;
		};

		/**
		 * History.forward(queue)
		 * Send the browser history forward one item
		 * @param {Integer} queue [optional]
		 */
		History.forward = function(queue){
			History.debug('History.forward: called', arguments);

			// Handle Queueing
			if ( queue !== false && History.busy() ) {
				// Wait + Push to Queue
				History.debug('History.forward: we must wait', arguments);
				History.pushQueue({
					scope: History,
					callback: History.forward,
					args: arguments,
					queue: queue
				});
				return false;
			}

			// Make Busy + Continue
			History.busy(true);

			// Fix a bug in IE6,IE7
			if ( History.emulated.hashChange && _History.isInternetExplorer() ) {
				// Prepare
				var currentHash = History.getHash();

				// Apply Check
				setTimeout(function(){
					var newHash = History.getHash();
					if ( newHash === currentHash ) {
						// No change occurred, try again
						History.debug('History.forward: trying again');
						return History.forward(false);
					}
					return true;
				},History.options.hashChangeCheckerDelay*5);
			}

			// Go forward
			history.go(1);

			// End forward closure
			return true;
		};

		/**
		 * History.go(index,queue)
		 * Send the browser history back or forward index times
		 * @param {Integer} queue [optional]
		 */
		History.go = function(index,queue){
			History.debug('History.go: called', arguments);

			// Handle
			if ( index > 0 ) {
				// Forward
				for ( var i=1; i<=index; ++i ) {
					History.forward(queue);
				}
			}
			else if ( index < 0 ) {
				// Backward
				for ( var i=-1; i>=index; --i ) {
					History.back(queue);
				}
			}
			else {
				throw new Error('History.go: History.go requires a positive or negative integer passed.');
			}

			// End go closure
			return true;
		};


		// ----------------------------------------------------------------------
		// HTML4 HashChange Support

		if ( History.emulated.hashChange ) {
			/*
			 * We must emulate the HTML4 HashChange Support by manually checking for hash changes
			 */

			History.Adapter.onDomLoad(function(){
				// Define our Checker Function
				_History.checkerFunction = null;

				// Handle depending on the browser
				if ( _History.isInternetExplorer() ) {
					// IE6 and IE7
					// We need to use an iframe to emulate the back and forward buttons

					// Create iFrame
					var
						iframeId = 'historyjs-iframe',
						iframe = document.createElement('iframe');

					// Adjust iFarme
					iframe.setAttribute('id', iframeId);
					iframe.style.display = 'none';

					// Append iFrame
					document.body.appendChild(iframe);

					// Create initial history entry
					iframe.contentWindow.document.open();
					iframe.contentWindow.document.close();

					// Define some variables that will help in our checker function
					var
						lastDocumentHash = null,
						lastIframeHash = null,
						checkerRunning = false;

					// Define the checker function
					_History.checkerFunction = function(){
						// Check Running
						if ( checkerRunning ) {
							History.debug('hashchange.checker: checker is running');
							return false;
						}

						// Update Running
						checkerRunning = true;

						// Fetch
						var
							documentHash = History.getHash(),
							iframeHash = _History.unescapeHash(iframe.contentWindow.document.location.hash);

						// The Document Hash has changed (application caused)
						if ( documentHash !== lastDocumentHash ) {
							// Equalise
							lastDocumentHash = documentHash;

							// Create a history entry in the iframe
							if ( iframeHash !== documentHash ) {
								History.debug('hashchange.checker: iframe hash change', 'documentHash (new):', documentHash, 'iframeHash (old):', iframeHash);

								// Equalise
								lastIframeHash = iframeHash = documentHash;

								// Create History Entry
								iframe.contentWindow.document.open();
								iframe.contentWindow.document.close();

								// Update the iframe's hash
								iframe.contentWindow.document.location.hash = _History.escapeHash(documentHash);
							}

							// Trigger Hashchange Event
							History.Adapter.trigger(window,'hashchange');
						}

						// The iFrame Hash has changed (back button caused)
						else if ( iframeHash !== lastIframeHash ) {
							History.debug('hashchange.checker: iframe hash out of sync', 'iframeHash (new):', iframeHash, 'documentHash (old):', documentHash);

							// Equalise
							lastIframeHash = iframeHash;

							// Update the Hash
							History.setHash(iframeHash,false);
						}

						// Reset Running
						checkerRunning = false;

						// Return true
						return true;
					};
				}
				else {
					// We are not IE
					// Firefox 1 or 2, Opera

					// Define some variables that will help in our checker function
					var
						lastDocumentHash = null;

					// Define the checker function
					_History.checkerFunction = function(){
						// Prepare
						var documentHash = History.getHash();

						// The Document Hash has changed (application caused)
						if ( documentHash !== lastDocumentHash ) {
							// Equalise
							lastDocumentHash = documentHash;

							// Trigger Hashchange Event
							History.Adapter.trigger(window,'hashchange');
						}

						// Return true
						return true;
					};
				}

				// Apply the checker function
				setInterval(_History.checkerFunction, History.options.hashChangeCheckerDelay);

				// Return true
				return true;

			}); // closure

		}

		// ----------------------------------------------------------------------
		// HTML5 State Support

		if ( History.emulated.pushState ) {
			/*
			 * We must emulate the HTML5 State Management by using HTML4 HashChange
			 */

			/**
			 * _History.onHashChange(event)
			 * Trigger HTML5's window.onpopstate via HTML4 HashChange Support
			 */
			_History.onHashChange = function(event){
				History.debug('_History.onHashChange',this,arguments);
				// Prepare
				var
					currentUrl						= (event && event.newURL) || document.location.href;
					currentHash						= unescape(History.extractHashFromUrl(currentUrl)),
					currentState					= null,
					currentStateHash			= null,
					currentStateHashExits	= null;

				// Check if we are the same state
				if ( _History.isLastHash(currentHash) ) {
					// There has been no change (just the page's hash has finally propagated)
					History.debug('_History.onHashChange: no change');
					History.busy(false);
					return false;
				}

				// Store our location for use in detecting back/forward direction
				_History.saveHash(currentHash);

				// Expand Hash
				currentState = History.expandHash(currentHash);
				if ( !currentState ) {
					// Traditional Anchor Hash
					History.debug('_History.onHashChange: traditional anchor');
					History.Adapter.trigger(window,'anchorchange');
					History.busy(false);
					return false;
				}

				// Check if we are the same state
				if ( _History.isLastState(currentState) ) {
					// There has been no change (just the page's hash has finally propagated)
					History.debug('_History.onHashChange: no change');
					History.busy(false);
					return false;
				}

				// Create the state Hash
				currentStateHash = History.contractState(currentState);

				// Log
				History.debug('_History.onHashChange: ',
					'currentStateHash',
					currentStateHash,
					'Hash -1',
					_History.getHashByIndex(-1),
					'Hash -2',
					_History.getHashByIndex(-2),
					'Hash -3',
					_History.getHashByIndex(-3),
					'Hash -4',
					_History.getHashByIndex(-4),
					'Hash -5',
					_History.getHashByIndex(-5),
					'Hash -6',
					_History.getHashByIndex(-6),
					'Hash -7',
					_History.getHashByIndex(-7)
				);

				// Check if we are DiscardedState
				var discardObject = _History.discardedState(currentState);
				if ( discardObject ) {
					History.debug('forwardState:',History.contractState(discardObject.forwardState),'backState:',History.contractState(discardObject.backState));
					// Ignore this state as it has been discarded and go back to the state before it
					if ( _History.getHashByIndex(-2) === History.contractState(discardObject.forwardState) ) {
						// We are going backwards
						History.debug('_History.onHashChange: go backwards');
						History.back(false);
					} else {
						// We are going forwards
						History.debug('_History.onHashChange: go forwards');
						History.forward(false);
					}
					History.busy(false);
					return false;
				}

				// Push the new HTML5 State
				History.debug('_History.onHashChange: success hashchange');
				History.pushState(currentState.data,currentState.title,currentState.url,false);

				// Return true
				return true;
			};
			History.Adapter.bind(window,'hashchange',_History.onHashChange);

			/**
			 * History.pushState(data,title,url)
			 * Add a new State to the history object, become it, and trigger onpopstate
			 * We have to trigger for HTML4 compatibility
			 * @param {object} data
			 * @param {string} title
			 * @param {string} url
			 * @return {true}
			 */
			History.pushState = function(data,title,url,queue){
				History.debug('History.pushState',this,arguments);

				// Check the State
				if ( History.extractHashFromUrl(url) ) {
					throw new Error('History.js does not support states with fragement-identifiers (hashes/anchors).');
				}

				// Handle Queueing
				if ( queue !== false && History.busy() ) {
					// Wait + Push to Queue
					History.debug('History.pushState: we must wait', arguments);
					History.pushQueue({
						scope: History,
						callback: History.pushState,
						args: arguments,
						queue: queue
					});
					return false;
				}

				// Make Busy
				History.busy(true);

				// Fetch the State Object
				var
					newState = History.createStateObject(data,title,url),
					newStateHash = History.contractState(newState),
					oldState = History.getState(),
					oldStateHash = History.getStateHash(),
					html4Hash = unescape(History.getHash());

				// Store the newState
				_History.storeState(newState);

				// Recycle the State
				_History.recycleState(newState);

				// Force update of the title
				if ( document.title !== newState.title ) {
					document.title = newState.title
					try {
						document.getElementsByTagName('title')[0].innerHTML = newState.title;
					}
					catch ( Exception ) { }
				}

				History.debug(
					'History.pushState: details',
					'newStateHash:', newStateHash,
					'oldStateHash:', oldStateHash,
					'html4Hash:', html4Hash
				);

				// Check if we are the same State
				if ( newStateHash === oldStateHash ) {
					History.debug('History.pushState: no change', newStateHash);
					return false;
				}

				// Update HTML4 Hash
				if ( newStateHash !== html4Hash ) {
					History.debug('History.pushState: update hash', newStateHash);
					History.setHash(newStateHash,false);
					return false;
				}

				// Update HTML5 State
				_History.saveState(newState);

				// Fire HTML5 Event
				History.debug('History.pushState: trigger popstate');
				History.Adapter.trigger(window,'statechange');
				History.busy(false);

				// Return true
				return true;
			};

			/**
			 * History.replaceState(data,title,url)
			 * Replace the State and trigger onpopstate
			 * We have to trigger for HTML4 compatibility
			 * @param {object} data
			 * @param {string} title
			 * @param {string} url
			 * @return {true}
			 */
			History.replaceState = function(data,title,url,queue){
				History.debug('History.replaceState',this,arguments);
				// Check the State
				if ( History.extractHashFromUrl(url) ) {
					throw new Error('History.js does not support states with fragement-identifiers (hashes/anchors).');
				}

				// Handle Queueing
				if ( queue !== false && History.busy() ) {
					// Wait + Push to Queue
					History.debug('History.replaceState: we must wait', arguments);
					History.pushQueue({
						scope: History,
						callback: History.replaceState,
						args: arguments,
						queue: queue
					});
					return false;
				}

				// Make Busy
				History.busy(true);

				// Fetch the State Objects
				var
					newState 				= History.createStateObject(data,title,url),
					oldState 				= History.getState(),
					previousState 	= _History.getStateByIndex(-2)

				// Discard Old State
				_History.discardState(oldState,newState,previousState);

				// Alias to PushState
				History.pushState(newState.data,newState.title,newState.url,false);

				// Return true
				return true;
			};

			/**
			 * Ensure initial state is handled correctly
			 **/
			if ( !document.location.hash || document.location.hash === '#' ) {
				History.Adapter.onDomLoad(function(){
					History.debug('Internet Explorer Initial State Change Fix');
					var currentState = History.createStateObject({},'',document.location.href);
					History.pushState(currentState.data,currentState.title,currentState.url);
				});
			} else if ( !History.emulated.hashChange ) {
				History.debug('Firefox Initial State Change Fix');
				History.Adapter.onDomLoad(function(){
					_History.onHashChange();
				});
			}

		}
		else {

			/**
			 * _History.onPopState(event,extra)
			 * Refresh the Current State
			 */
			_History.onPopState = function(event){
				History.debug('_History.onPopState',this,arguments);

				// Check for a Hash, and handle apporiatly
				var currentHash	= unescape(History.getHash());
				if ( currentHash ) {
					// Expand Hash
					var currentState = History.expandHash(currentHash);
					if ( currentState ) {
						// We were able to parse it, it must be a State!
						// Let's forward to replaceState
						History.debug('_History.onPopState: state anchor', currentHash, currentState);
						History.replaceState(currentState.data, currentState.tite, currentState.url, false);
					}
					else {
						// Traditional Anchor
						History.debug('_History.onPopState: traditional anchor', currentHash);
						History.Adapter.trigger(window,'anchorchange');
						History.busy(false);
					}

					// We don't care for hashes
					return false;
				}

				// Prepare
				var
					currentStateHashExits				= null,
					stateData										= {},
					stateTitle									= null,
					stateUrl										= null,
					newState										= null;

				// Prepare
				event = event||{};
				if ( typeof event.state === 'undefined' ) {
					// jQuery
					if ( typeof event.originalEvent !== 'undefined' && typeof event.originalEvent.state !== 'undefined' ) {
						event.state = event.originalEvent.state;
					}
					// MooTools
					else if ( typeof event.event !== 'undefined' && typeof event.event.state !== 'undefined' ) {
						event.state = event.event.state;
					}
				}

				// Fetch Data
				if ( event.state === null ) {
					// Vanilla: State has no data (new state, not pushed)
					stateData = event.state;
				}
				else if ( typeof event.state !== 'undefined' ) {
					// Vanilla: Back/forward button was used

					// Using Chrome Fix
					var
						newStateUrl = History.expandUrl(document.location.href),
						oldState = _History.getStateByUrl(newStateUrl),
						duplicateExists = _History.urlDuplicateExists(newStateUrl);

					// Does oldState Exist?
					if ( typeof oldState !== 'undefined' && !duplicateExists ) {
						stateData = oldState.data;
					}
					else {
						stateData = event.state;
					}

					// Use the way that should work
					// stateData = event.state;
				}
				else {
					// Vanilla: A new state was pushed, and popstate was called manually

					// Get State object from the last state
					var
						newStateUrl = History.expandUrl(document.location.href),
						oldState = _History.getStateByUrl(newStateUrl);

					// Check if the URLs match
					if ( oldState && newStateUrl == oldState.url ) {
						stateData = oldState.data;
					}
					else {
						throw new Error('Unknown state');
					}
				}

				// Resolve newState
				stateData		= (typeof stateData !== 'object' || stateData === null) ? {} : stateData;
				stateTitle	=	stateData.title||'',
				stateUrl		=	stateData.url||document.location.href,
				newState		=	History.createStateObject(stateData,stateTitle,stateUrl);

				// Check if we are the same state
				if ( _History.isLastState(newState) ) {
					// There has been no change (just the page's hash has finally propagated)
					History.debug('_History.onPopState: no change', newState, _History.savedStates);
					History.busy(false);
					return false;
				}

				// Log
				History.debug(
					'_History.onPopState',
					'newState:', newState,
					'oldState:', _History.getStateByUrl(History.expandUrl(document.location.href)),
					'duplicateExists:', _History.urlDuplicateExists(History.expandUrl(document.location.href))
				);

				// Store the State
				_History.storeState(newState);
				_History.saveState(newState);

				// Force update of the title
				if ( newState.title ) {
					document.title = newState.title
				}

				// Fire Our Event
				History.Adapter.trigger(window,'statechange');
				History.busy(false);

				// Return true
				return true;
			};
			History.Adapter.bind(window,'popstate',_History.onPopState);

			/**
			 * History.pushState(data,title,url)
			 * Add a new State to the history object, become it, and trigger onpopstate
			 * We have to trigger for HTML4 compatibility
			 * @param {object} data
			 * @param {string} title
			 * @param {string} url
			 * @return {true}
			 */
			History.pushState = function(data,title,url,queue){
				// Check the State
				if ( History.extractHashFromUrl(url) ) {
					throw new Error('History.js does not support states with fragement-identifiers (hashes/anchors).');
				}

				// Handle Queueing
				if ( queue !== false && History.busy() ) {
					// Wait + Push to Queue
					History.debug('History.pushState: we must wait', arguments);
					History.pushQueue({
						scope: History,
						callback: History.pushState,
						args: arguments,
						queue: queue
					});
					return false;
				}

				// Make Busy + Continue
				History.busy(true);

				// Create the newState
				var newState = History.createStateObject(data,title,url);

				// Store the newState
				_History.storeState(newState);

				// Push the newState
				history.pushState(newState.data,newState.title,newState.url);

				// Fire HTML5 Event
				History.Adapter.trigger(window,'popstate');

				// Return true
				return true;
			}

			/**
			 * History.replaceState(data,title,url)
			 * Replace the State and trigger onpopstate
			 * We have to trigger for HTML4 compatibility
			 * @param {object} data
			 * @param {string} title
			 * @param {string} url
			 * @return {true}
			 */
			History.replaceState = function(data,title,url,queue){
				// Check the State
				if ( History.extractHashFromUrl(url) ) {
					throw new Error('History.js does not support states with fragement-identifiers (hashes/anchors).');
				}

				// Handle Queueing
				if ( queue !== false && History.busy() ) {
					// Wait + Push to Queue
					History.debug('History.replaceState: we must wait', arguments);
					History.pushQueue({
						scope: History,
						callback: History.replaceState,
						args: arguments,
						queue: queue
					});
					return false;
				}

				// Make Busy + Continue
				History.busy(true);

				// Create the newState
				var newState = History.createStateObject(data,title,url);

				// Store the newState
				_History.storeState(newState);

				// Push the newState
				history.replaceState(newState.data,newState.title,newState.url);

				// Fire HTML5 Event
				History.Adapter.trigger(window,'popstate');

				// Return true
				return true;
			}


			/**
			 * Ensure Cross Browser Compatibility
			 **/
			if ( navigator.vendor === 'Apple Computer, Inc.' ) {
				/**
				 * Fix Safari Initial State Issue
				 */
				History.Adapter.onDomLoad(function(){
					History.debug('Safari Initial State Change Fix');
					var currentState = History.createStateObject({},'',document.location.href);
					History.pushState(currentState.data,currentState.title,currentState.url);
				});

				/**
				 * Fix Safari HashChange Issue
				 */
				History.Adapter.bind(window,'hashchange',function(){
					History.Adapter.trigger(window,'popstate');
				});
			}
		}


	}; // init

	// Check Load Status
	if ( typeof History.Adapter !== 'undefined' ) {
		// Adapter loaded faster than History.js, fire init.
		History.init();
	}

})(window);
