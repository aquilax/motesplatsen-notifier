(function(document){

	function sendMessage(message, callback) {
		chrome.runtime.sendMessage(message, function(response) {
			if (callback) {
				return callback(response)
			}
		});
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
		});
	}

	function loadSettings() {
		sendMessage({
			exec: 'getSettings',
			args: []
		}, updateSettingsOnPage);
	}

	function updateSettingsOnPage(settings) {
		var checkboxes = document.getElementsByTagName('input');
		[].forEach.call(checkboxes, function(checkbox) {
			checkbox.checked = settings[checkbox.dataset.name][checkbox.dataset.type];
		});
	}

	function translate() {
		var elements = document.querySelectorAll('.translate');
		[].forEach.call(elements, function(element) {
			element.innerHtml = 'TR:' + element.innerHtml;
		});
	}

	document.addEventListener("DOMContentLoaded", function() {
		loadSettings();
		translate();
		init();
	});
})(document);