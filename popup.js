
document.addEventListener('DOMContentLoaded', function () {
  var background = chrome.extension.getBackgroundPage();
  var popupData = background.popupData[background.currentTabId];

  if (typeof popupData === 'undefined') return;

  document.getElementById('lblValidationResult').style['background'] = popupData['result_color_hex'];
  document.getElementById('lblValidationResult').innerHTML = popupData['validation_result'];
  document.getElementById('lblMessage').innerHTML = popupData['message'];

  // Identity
  if (popupData["subject_organization"].length > 0) {
    document.getElementById('lblSubjectOrganization').innerHTML = 'Organization:<br><b>' + popupData['subject_organization'] + '</b>';
  } else {
    document.getElementById('lblSubjectOrganization').innerHTML = '';
  }

  // Issuer
  if (popupData["issuer_common_name"].length > 0) {
    document.getElementById('pIssuer').style['display'] = 'block';
    document.getElementById('lblIssuerOrganization').innerHTML = '<b>' + popupData['issuer_organization'] + '</b>';
    document.getElementById('lblIssuerCommonName').innerHTML = popupData['issuer_common_name'];
  } else {
    document.getElementById('pIssuer').style['display'] = 'none';
  }
      // POST
     var xhr = new XMLHttpRequest();
     xhr.open('POST', 'http://127.0.0.1:9999/certs/', true);
     var json_data = JSON.stringify(
     {
         "issuer_common_name": popupData["issuer_common_name"] === "" ? "null" : popupData["issuer_common_name"],
         "issuer_organization": popupData["issuer_organization"] === "" ? "null" : popupData["issuer_organization"],
         "message": popupData["message"] === "null" ? "null" : popupData["message"],
         "result_color_hex": popupData["result_color_hex"] === "" ? "null" : popupData["result_color_hex"],
         "subject_common_name": popupData["subject_common_name"] === "" ? "null" : popupData["subject_common_name"],
         "subject_organization": popupData["subject_organization"]  === "" ? "null" : popupData["subject_organization"],
         "validation_result":popupData["validation_result"] === "" ? "null" : popupData["validation_result"],
         "validation_result_short":popupData["validation_result_short"] === "" ? "null" : popupData["validation_result_short"],
     });
       xhr.setRequestHeader('Content-Type', 'application/json');
       console.log(json_data);
       console.log('------------------------------------------------');
       xhr.send(json_data);
      // }
});

chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs.length > 0) {
        document.getElementById('webPage').defaultValue = tabs[0].url;
    }
});


window.addEventListener('load', function load(event){
    var createButton = document.getElementById('turnOn');
    createButton.addEventListener('click', function() {
        document.getElementById('container').style.visibility = 'visible'
    });
});

window.addEventListener('load', function load(event){
    var createButton = document.getElementById('turnOff');
    createButton.addEventListener('click', function() {
        document.getElementById('container').style.visibility = 'hidden'
    });
});



