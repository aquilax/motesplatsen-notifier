(function(chrome){

  var requestTimeout = 1000 * 4;
  
  function updateIcon() {
    if (!localStorage.hasOwnProperty('unreadCount')) {
      chrome.browserAction.setBadgeText({text:"?"});
    } else {
      chrome.browserAction.setBadgeText({
        text: localStorage.unreadCount != "0" ? localStorage.unreadCount : ""
      });
    }
  }

  function onWatchdog() {
    chrome.alarms.get('refresh', function(alarm) {
      if (alarm) {
        console.log('Refresh alarm exists. Yay.');
      } else {
        console.log('Refresh alarm doesn\'t exist!? ' +
                    'Refreshing now and rescheduling.');
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
    debugger;
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
          handleSuccess(result);
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
    var changed = localStorage.unreadCount != count;
    localStorage.unreadCount = count;
    updateIcon();
    if (changed)
      animateFlip();
  }

  function startRequest(params) {
    if (params && params.scheduleRequest) scheduleRequest();

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
  startRequest({scheduleRequest:false, showLoadingAnimation:false});
})(chrome || {});
