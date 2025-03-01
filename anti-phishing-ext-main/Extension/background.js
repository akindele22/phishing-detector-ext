chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) {
      checkUrl(tabs[0].url);
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    checkUrl(tab.url);
  }
});

function checkUrl(url) {
  fetch('http://localhost:6500/api/predict', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url: url })
  })
  .then(response => response.json())
  .then(data => {
    if (data.result === 'malicious') {
      saveMaliciousUrl(url);
      showEducationalPopup(url, 'malicious');
      sendAnalytics(url, 'malicious'); // Track the event
    } else if (data.result === 'benign') {
      showEducationalPopup(url, 'benign');
      sendAnalytics(url, 'benign'); // Track the event
    }
  })
  .catch(error => console.error('Error:', error));
}

function showEducationalPopup(url, status) {
  let notificationOptions;

  if (status === 'malicious') {
    notificationOptions = {
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Malicious URL Detected',
      message: `The URL ${url} has been flagged as potentially phishing. Learn more about phishing attacks and how to protect yourself:`,
      buttons: [{ title: 'Learn More' }],
      priority: 0
    };
  } else {
    notificationOptions = {
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Safe URL Detected',
      message: `The URL ${url} is detected as safe. However, always stay cautious and informed about safe browsing practices.`,
      buttons: [{ title: 'Learn More' }],
      priority: 0
    };
  }

  chrome.notifications.create(notificationOptions, (notificationId) => {
    chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
      if (notifId === notificationId && btnIdx === 0) {
        if (status === 'malicious') {
          showMaliciousEducationContent(url);
        } else {
          showSafeBrowsingTips(url);
        }
      }
    });
  });
}

function saveMaliciousUrl(url) {
  chrome.storage.local.get({ maliciousUrls: [] }, (result) => {
    const maliciousUrls = result.maliciousUrls;
    maliciousUrls.push(url);
    chrome.storage.local.set({ maliciousUrls: maliciousUrls }, () => {
      console.log('Malicious URL saved.');
    });
  });
}

function showMaliciousEducationContent(url) {
  const popupHtml = `
    <h2>Phishing Alert</h2>
    <p>The URL <strong>${url}</strong> has been flagged as potentially phishing. Learn more about phishing attacks and how to protect yourself:</p>
    <ul>
      <li>Phishing is a type of social engineering attack where attackers deceive individuals into providing sensitive information.</li>
      <li>Always verify the source of emails and websites before entering personal information.</li>
      <li>Look for signs of phishing such as poor grammar, urgent language, and suspicious links.</li>
      <li>Attackers on the site you're trying to visit might trick you into installing software or revealing things like your password, phone, or credit card number.</li>
      <li>Use two-factor authentication whenever possible to add an extra layer of security.</li>
      <li>Keep your software and antivirus updated to protect against known vulnerabilities.</li>
      <li>Learn more about common phishing techniques and how to avoid them at.</li>
    </ul>
  `;

  chrome.windows.create({
    url: "data:text/html," + encodeURIComponent(popupHtml),
    type: "popup",
    width: 400,
    height: 400
  });
}

function showSafeBrowsingTips(url) {
  const popupHtml = `
    <h2>Safe Browsing Tips</h2>
    <p>The URL <strong>${url}</strong> is detected as safe. However, it's important to stay informed about safe browsing practices:</p>
    <ul>
      <li>Always verify the URL and make sure it matches the website you intend to visit.</li>
      <li>Be cautious of unsolicited emails or messages asking for personal information.</li>
      <li>Look for HTTPS in the URL to ensure a secure connection.</li>
      <li>Be wary of pop-ups or ads that seem too good to be true.</li>
      <li>Use a reputable antivirus program and keep it updated.</li>
      <li>Regularly update your browser and other software to protect against vulnerabilities.</li>
      <li>Learn more about safe browsing practices at.</li>
    </ul>
  `;

  chrome.windows.create({
    url: "data:text/html," + encodeURIComponent(popupHtml),
    type: "popup",
    width: 400,
    height: 400
  });
}


function sendAnalytics(url, prediction) {
  const event = {
      event: 'url_prediction',
      url: url,
      prediction: prediction,
      timestamp: new Date().toISOString()
  };
  fetch('http://localhost:6500/api/track', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
  })
  .catch(error => console.error('Error sending analytics:', error));
}

// Adding a listener for the retrainModel message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'retrainModel') {
      retrainModel();
      sendResponse({status: 'retraining started'});
  }
});


// Function to track retraining event
function retrainModel() {
  fetch('http://localhost:6500/api/retrain', {
      method: 'POST',
  })
  .then(response => response.json())
  .then(data => {
      if (data.message) {
          alert(data.message);
          sendAnalytics('retrain_model', 'success'); // Track the retrain success event
      } else {
          alert('Retraining failed: ' + data.error);
          sendAnalytics('retrain_model', 'failure'); // Track the retrain failure event
      }
  })
  .catch(error => {
      console.error('Error:', error);
      sendAnalytics('retrain_model', 'error'); // Track the retrain error event
  });
}

// Adding a listener for the retrainModel message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'retrainModel') {
      retrainModel();
      sendResponse({status: 'retraining started'});
  }
});