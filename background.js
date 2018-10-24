
const colors = {'': '#888', 'gray': '#888', 'red': '#FF1744', 'orange': '#EF6C00'};

// In-memory data store
var cachedValidatonData = {};
var popupData = {};
var currentTabId = 0;
var similarityTrigger = false;

// Update all tabs on start
// updateAllTabs();

// Perform update on all tabs
function updateAllTabs() {
  chrome.tabs.query({}, function(tab) {
    for (var i = 0; i < tab.length; i++) {
      updateTab(tab[i], false);
    }
  });

  // Update currentTabId
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs.length > 0) {
      currentTabId = tabs[0].id;
    }
  });
}

// Update on windows focus change
chrome.windows.onFocusChanged.addListener(function(windowId) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs.length > 0) {
      currentTabId = tabs[0].id;
    }
  });
});

// Update on tab activation
chrome.tabs.onActivated.addListener(function(activeInfo) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    currentTabId = tabs[0].id;
  });
});

// Update on content change
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  // Update tab only when tab status is 'loading'
  if ('status' in changeInfo && changeInfo['status'] === 'loading') {
    updateTab(tab);
  }

  // Also update on HTTPS error
  if ('title' in changeInfo && changeInfo['title'] === 'Privacy error') {
    updateTab(tab);
  }
});

// Get connection protocol. Warn for HTTP.
function pageProtocol(url) {
    if (url.substring(0, 7) === 'http://') {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs.length > 0) {
                chrome.notifications.create({
                    type: "basic",
                    title: "Попередження системи безпеки",
                    message: "Увага! Вами було здійснено вхід на незахищений сайт, що використовує HTTP протокол!",
                    iconUrl: "icon_48.png"
                }, function () {
                    console.log('Notification appered! Did it...riight?');
                });
            }
        });
    return 'http';
    //warn for phishing
  } else if (url.substring(0, 8) === 'https://') {
      if(checkSimilarity(url, "https://www.privat24.ua/") > 0.6){
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
              if (tabs.length > 0) {
                  chrome.notifications.create({
                      type: "basic",
                      title: "ПОМИЛКА СИСТЕМИ БЕЗПЕКИ!",
                      message: "Завантажений сайт " + url + " відмічено, як небезпечний. Будь ласка, активуйте поп-Ап вікно додатку!",
                      iconUrl: "icon_48.png"
                  }, function () {
                      console.log('Notification appered! Did it...riight?');
                  });
              }
          });
      }
      return 'https';
  } else {
    return '';
  }
}

// Get hostname
function extractHostname(url) {
    // Extract hostname
    var hostname = url.substr(8, url.length - 1 - 8);
    for (var i = 8, len = url.length; i < len; i++) {
      if (url[i] === '/') {
        hostname = url.substr(8, i - 8);
        break;
      }
    }
    return hostname;
}

// Fetch and display cert info for a tab
function updateTab(tab) {
  // Validate and get tab info
  if (typeof tab === 'undefined') return;
  var url = tab.url;
  var tabId = tab.id;
  if (typeof url === 'undefined' || typeof tabId === 'undefined') return;

  // Find out page protocol
  var proto = pageProtocol(url);

  if (proto === 'https') {
    var hostname = extractHostname(url);

    // Display data if already fetched
    if (hostname in cachedValidatonData) {
      displayPageInfo(tabId, proto, false, cachedValidatonData[hostname])
      return;
    }

    // Fetch
    displayPageInfo(tabId, proto, true, null);
    fetchCertInfo(hostname, function(data) {
      // Store response
      if (data !== null) {
        cachedValidatonData[hostname] = data;
      }
      displayPageInfo(tabId, proto, false, data);
    });
    return;
  }

  displayPageInfo(tabId, proto, false, null);
}

// Display page info
function displayPageInfo(tabId, pageProtocol, loading, validationData) {
  if (loading) {
    updateBadge(tabId, colors['gray'], '...');
    updatePopupData(tabId, null, colors['gray'], 'Loading...', 'Loading validation data, try opening this popup again.');
    return;
  }

  if (pageProtocol === 'http') {
    // Show warning for HTTP
    updateBadge(tabId, colors['orange'], 'i');
    updatePopupData(tabId, null, colors['orange'], 'HTTP Page', 'Data sent to / received from this site is transmitted in plaintext.');
  } else if (pageProtocol === 'https') {
    // HTTPS
    // If failed to fetch data
    if (validationData === null) {
      updateBadge(tabId, colors['red'], '!');
      updatePopupData(tabId, null, colors['red'], 'Data fetch error', 'Try reloading the page. Note that this extension only works with publicly accessible sites.');
      return;
    }
    // Display data
    updateBadge(tabId, validationData['result_color_hex'], validationData['validation_result_short']);
    updatePopupData(tabId, validationData, null, null, null);
  } else {
    // Clear badge and popup data
    updateBadge(tabId, '', '');
    delete popupData[tabId];
  }
}

// Update badge
function updateBadge(tabId, color, text) {
  // Don't update if no tabId provided
  if (typeof tabId === 'undefined') {
    return;
  }

  if (color !== "") {
    chrome.browserAction.setBadgeBackgroundColor({color: color, tabId: tabId});
  }
  chrome.browserAction.setBadgeText({text: text, tabId: tabId});
}

// Update popup data
function updatePopupData(tabId, data, color, validationResult, message) {
  if (data !== null) {
    popupData[tabId] = data;
  } else {
    popupData[tabId] = {};
    popupData[tabId]['result_color_hex'] = color;
    popupData[tabId]['validation_result'] = validationResult;
    popupData[tabId]['subject_organization'] = '';
    popupData[tabId]['issuer_common_name'] = '';
    popupData[tabId]['message'] = message;
  }
}

// TODO JSON data requests
// Fetch cert info through API
// Only hostname is sent
function fetchCertInfo(hostname, callback) {
  // Create XHR
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    // Only handle event when request is finished
    if (xhr.readyState !== 4) {
      return;
    }

    if (typeof this.responseText === 'undefined' || this.responseText.length === 0) {
      callback(null);
      return;
    }

    // Parse
    try {
      var validationData = JSON.parse(this.responseText);
      callback(validationData);
    } catch(e) {
      callback(null);
    }
  };

  // Make request
  xhr.open('GET', 'https://api.blupig.net/certificate-info/validate', true);
  xhr.setRequestHeader('x-validate-host', hostname);
  xhr.send();

}

// chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
//     if (tabs.length > 0){
//       if (tabs[0].url === "https://www.privat24.ua/") {
//           chrome.windows.create({
//               url:"test.html",
//               type:"panel",
//               width:300,
//               height:200
//           });
//       }
//       else {
//         alert("Nope!");
//       }
//     }
// });

// Validate page URL
function checkSimilarity(string1, string2) {
    return similarity(string1, string2);
}

function similarity(s1, s2) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength === 0) {
        return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = [];
    for (var i = 0; i <= s1.length; i++) {
        var lastValue = i;
        for (var j = 0; j <= s2.length; j++) {
            if (i === 0)
                costs[j] = j;
            else {
                if (j > 0) {
                    var newValue = costs[j - 1];
                    if (s1.charAt(i - 1) !== s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0)
            costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}





