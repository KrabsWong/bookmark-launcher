let isSearchOpen = false;

function injectContentScript(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("about:")) {
      console.log("Cannot inject script into this page:", tab.url);
      return;
    }

    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).then(() => {
      openBookmarkSearch(tabId);
    }).catch(error => console.error("Error injecting script:", error));
  });
}

function openBookmarkSearch(tabId) {
  if (!isSearchOpen) {
    isSearchOpen = true;
    chrome.tabs.sendMessage(tabId, { action: "openBookmarkSearch" });
  }
}

function closeBookmarkSearch(tabId) {
  if (isSearchOpen) {
    isSearchOpen = false;
    chrome.tabs.sendMessage(tabId, { action: "closeBookmarkSearch" });
  }
}

function handleAction(tab) {
  chrome.tabs.sendMessage(tab.id, { action: "checkSearchStatus" })
    .then(response => {
      if (response && response.exists) {
        closeBookmarkSearch(tab.id);
      } else {
        injectContentScript(tab.id);
      }
    })
    .catch(() => {
      injectContentScript(tab.id);
    });
}

chrome.action.onClicked.addListener(handleAction);

chrome.commands.onCommand.addListener((command) => {
  if (command === "_execute_action") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        handleAction(tabs[0]);
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "searchBookmarks") {
    chrome.bookmarks.search(request.query, (results) => {
      sendResponse(results);
    });
    return true;
  } else if (request.action === "getRecentBookmarks") {
    chrome.bookmarks.getRecent(100, (bookmarks) => {
      sendResponse(bookmarks);
    });
    return true;
  } else if (request.action === "openInNewTab") {
    chrome.tabs.create({ url: request.url });
    return true;
  } else if (request.action === "searchClosed") {
    isSearchOpen = false;
    return true;
  }
});