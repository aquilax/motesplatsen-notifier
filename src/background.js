(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-115818-45', 'auto');
ga('set', 'checkProtocolTask', function(){});
ga('send', 'pageview', '/extension.html');

(function(chrome){

	var pollIntervalMin = 1;
	var pollIntervalMax = 60;

	var requestTimeout = 1000 * 4;
	var self = this;
	var defaultSettings = {
		newDates: {
			count: true,
			notify: false
		},
		newMatches:{
			count: true,
			notify: false
		},
		newMembers:{
			count: true,
			notify: false
		},
		newMessages:{
			count: true,
			notify: false
		},
		newVisitors:{
			count: true,
			notify: false
		},
		newPhotos:{
			count: true,
			notify: false
		}
	};
	var defaultLastCount = {
		newDates: '?',
		newMatches: '?',
		newMembers: '?',
		newMessages: '?',
		newVisitors: '?',
		newPhotos: '?'
	};

	var rpc = {
		getSettings: function () {
			ga('send', 'event', 'popup', 'window', 'open');
			return loadSettings();
		},

		updateSettings: function (update) {
			var settings = loadSettings();
			settings[update.name][update.type] = update.value;
			saveSettings(settings);
		},
		getLastCount: function() {
			return loadLastCount();
		},
		openTab: function(url) {
			chrome.permissions.request({
				permissions: ['tabs']
			}, function(granted) {
				if (granted) {
					ga('send', 'event', 'popup', 'url', 'open', 1);
					chrome.tabs.create({
						url: url
					});
					return;
				}
				ga('send', 'event', 'popup', 'url', 'open', 0);
			});
		}
	};

	function loadLastCount() {
		if (!localStorage.hasOwnProperty('lastCount')) {
			return defaultLastCount;
		}
		return JSON.parse(localStorage.lastCount);
	}

	function saveLastCount(lastCount) {
		localStorage.lastCount = JSON.stringify(lastCount);
	}

	function loadSettings(){
		if (!localStorage.hasOwnProperty('settings')) {
			return defaultSettings;
		}
		return JSON.parse(localStorage.settings);
	}

	function saveSettings(settings) {
		localStorage.settings = JSON.stringify(settings);
	}
	function updateIcon() {
		if (!localStorage.hasOwnProperty('unreadCount')) {
			chrome.browserAction.setBadgeText({text:"?"});
		} else {
			chrome.browserAction.setBadgeText({
				text: localStorage.unreadCount != '0' ? localStorage.unreadCount + '': ''
			});
		}
	}

	function onWatchdog() {
		chrome.alarms.get('refresh', function(alarm) {
			if (!alarm) {
				startRequest({scheduleRequest:true, showLoadingAnimation:false});
			}
		});
	}

	function scheduleRequest() {
		var randomness = Math.random() * 2;
		var exponent = Math.pow(2, localStorage.requestFailureCount || 0);
		var multiplier = Math.max(randomness * exponent, 1);
		var delay = Math.min(multiplier * pollIntervalMin, pollIntervalMax);
		delay = Math.round(delay);
		chrome.alarms.create('refresh', {periodInMinutes: delay});
	}

	function getFeedUrl() {
		return 'https://www.motesplatsen.se/api/v2/menu';
	}

	function fetchStatus(onSuccess, onError) {
		var xhr = new XMLHttpRequest();
		var abortTimerId = window.setTimeout(function() {
			xhr.abort();  // synchronously calls onreadystatechange
		}, requestTimeout);

		function handleSuccess(result) {
			ga('send', 'event', 'feed', 'fetch', 'success');
			localStorage.requestFailureCount = 0;
			window.clearTimeout(abortTimerId);
			if (onSuccess) {
				onSuccess(result);
			}
		}

		var invokedErrorCallback = false;
		function handleError() {
			++localStorage.requestFailureCount;
			ga('send', 'event', 'feed', 'fetch', 'error',
				localStorage.requestFailureCount);
			window.clearTimeout(abortTimerId);
			if (onError && !invokedErrorCallback) {
				onError();
			}
			invokedErrorCallback = true;
		}

		try {
			xhr.onreadystatechange = function() {
				if (xhr.readyState != 4) {
					return;
				}

				if (xhr.responseText) {
					result = JSON.parse(xhr.responseText);
					if (result.hasOwnProperty('menu')) {
						return handleSuccess(result);
					}
				}
				handleError();
			};

			xhr.onerror = function(error) {
				handleError();
			};

			xhr.open("GET", getFeedUrl(), true);
			xhr.setRequestHeader('Accept', 'application/json, text/javascript');
			xhr.setRequestHeader('Mp-ClientInfo', 'WebMp/146 (sv-SE)');
			xhr.send(null);
		} catch(e) {
			handleError();
		}
	}

	function updateCount(data) {
		var total = 0;
		var hint = [];
		var settings = loadSettings();
		var lastCount = loadLastCount();
		Object.keys(data.menu).forEach(function(key) {
			if (key.indexOf('new') === 0) {
				if (settings[key] && settings[key].count){
					total += parseInt(data.menu[key], 10);
				}
				lastCount[key] = data.menu[key];
				hint.push(key.substring(3) + ': ' + data.menu[key]);
			}
		});
		saveLastCount(lastCount);
		chrome.browserAction.setTitle({
			title: hint.join("\n")
		});
		var changed = localStorage.unreadCount != total;
		localStorage.unreadCount = total;
		updateIcon();
		if (changed) {
			// Notify
		}
	}

	function startRequest(params) {
		if (params && params.scheduleRequest) {
			scheduleRequest();
		}
		fetchStatus(
			function(data) {
				updateCount(data);
			},
			function() {
				delete localStorage.unreadCount;
				saveLastCount(defaultLastCount);
				updateIcon();
			}
		);
	}

	function onInit() {
		localStorage.requestFailureCount = 0;
		startRequest({scheduleRequest:true, showLoadingAnimation:true});
		chrome.alarms.create('watchdog', {periodInMinutes:5});
	}

	function onAlarm(alarm) {
		if (alarm && alarm.name == 'watchdog') {
			onWatchdog();
		} else {
			startRequest({scheduleRequest:true, showLoadingAnimation:false});
		}
	}
	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
		if (request.exec) {
			sendResponse(rpc[request.exec].apply(this, request.args));
		}
	});

	chrome.runtime.onInstalled.addListener(onInit);
	chrome.alarms.onAlarm.addListener(onAlarm);
	chrome.runtime.onStartup.addListener(function() {
		startRequest({scheduleRequest:false, showLoadingAnimation:false});
		updateIcon();
	});
})(chrome || {});
