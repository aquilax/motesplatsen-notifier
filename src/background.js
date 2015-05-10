(function(chrome){

  var requestTimeout = 1000 * 4;
  
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
    delay = 1;
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
      localStorage.requestFailureCount = 0;
      window.clearTimeout(abortTimerId);
      if (onSuccess) {
        onSuccess(result);
      }
    }

    var invokedErrorCallback = false;
    function handleError() {
      ++localStorage.requestFailureCount;
      window.clearTimeout(abortTimerId);
      if (onError && !invokedErrorCallback)
        onError();
      invokedErrorCallback = true;
    }

    try {
      xhr.onreadystatechange = function() {
        if (xhr.readyState != 4) {
          return;
        }

        if (xhr.responseText) {
          result = JSON.parse(xhr.responseText);
          return handleSuccess(result);
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
    Object.keys(data.menu).forEach(function(key) {
      if (key.indexOf('new') === 0) {
        total += parseInt(data.menu[key], 10);
        hint.push(key.substring(3) + ': ' + data.menu[key]);
      }
    });
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

  chrome.runtime.onInstalled.addListener(onInit);
  chrome.alarms.onAlarm.addListener(onAlarm);
  chrome.runtime.onStartup.addListener(function() {
    startRequest({scheduleRequest:false, showLoadingAnimation:false});
    updateIcon();
  });
})(chrome || {});
