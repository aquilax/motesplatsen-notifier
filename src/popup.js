(function(document){

	function sendUpdate(data) {
		console.log(data);
	}

	function init() {
		document.body.addEventListener('click', function(ev){
			if (ev.target && ev.target.type && ev.target.type === 'checkbox') {
				var checkbox = ev.target;
				var update = {
					name: checkbox.dataset.name,
					type: checkbox.dataset.type,
					checked: checkbox.checked
				};
				return sendUpdate(update);
			}
		});
	}

	function translate() {
		document.querySelectorAll('.translate').forEach(function(node) {
			node.innerHtml = 'TR:' + node.innerHtml;
		});
	}

	document.addEventListener("DOMContentLoaded", function() {
		translate();
		init();
	});
})(document);