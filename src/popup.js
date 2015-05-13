(function(document){

	function sendMessage(message, callback) {
		callback = callback || function(response){};
		chrome.runtime.sendMessage(message, callback);
	}

	function sendUpdate(data) {
		sendMessage({
			exec: 'updateSettings',
			args: [data]
		});
	}

	function init() {
		document.body.addEventListener('click', function(ev){
			if (ev.target && ev.target.type && ev.target.type === 'checkbox') {
				var checkbox = ev.target;
				var update = {
					name: checkbox.dataset.name,
					type: checkbox.dataset.type,
					value: checkbox.checked
				};
				return sendUpdate(update);
			}
			if (ev.target && ev.target.tagName == 'A') {
				event.preventDefault();
				sendMessage({
					exec: 'openTab',
					args: [ev.target.href]
				});
				return false;
			}
		});
	}

	function loadSettings() {
		sendMessage({
			exec: 'getSettings',
			args: []
		}, updateSettingsOnPage);
	}

	function getLastCount() {
		sendMessage({
			exec: 'getLastCount',
			args: []
		}, updateLastCountOnPage);
	}

	function updateSettingsOnPage(settings) {
		window.setTimeout(function(){
			var checkboxes = document.getElementsByTagName('input');
			[].forEach.call(checkboxes, function(checkbox) {
				checkbox.checked = settings[checkbox.dataset.name][checkbox.dataset.type];
			});
		}, 1);
	}

	
	function updateLastCountOnPage(countObj) {
		window.setTimeout(function(){
			Object.keys(countObj).forEach(function(key) {
				var el = document.getElementById(key);
				var value = countObj[key];
				el.innerHTML = countObj[key];
			});
		}, 1);
	}

	function translate() {
		var elements = document.querySelectorAll('.translate');
		[].forEach.call(elements, function(element) {
			element.innerHtml = 'TR:' + element.innerHtml;
		});
	}

	document.addEventListener("DOMContentLoaded", function() {
		loadSettings();
		getLastCount();
		translate();
		init();
	});
})(document);