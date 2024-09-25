console.log("Content script loaded");

let searchOverlay = null;
let selectedIndex = -1;

function createBookmarkSearch() {
  if (searchOverlay) {
    console.log("Search overlay already exists");
    return;
  }

  console.log("Creating bookmark search overlay");

  searchOverlay = document.createElement('div');
  searchOverlay.id = 'bookmark-search-overlay';
  searchOverlay.innerHTML = `
    <div id="bookmark-search-container">
      <input type="text" id="search-input" placeholder="Search bookmarks...">
      <ul id="results-list"></ul>
    </div>
  `;
  document.body.appendChild(searchOverlay);

  const searchInput = document.getElementById('search-input');
  const resultsList = document.getElementById('results-list');

  searchInput.focus();

  searchInput.addEventListener('input', function () {
    const query = this.value.toLowerCase();
    chrome.runtime.sendMessage({ action: "searchBookmarks", query: query }, function (results) {
      displayResults(results, query);
      selectedIndex = -1;
      updateSelection();
    });
  });

  // 修改键盘事件监听器
  searchInput.addEventListener('keydown', function (e) {
    const results = resultsList.querySelectorAll('li:not(.no-results)');
    const resultsCount = results.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % resultsCount;
        updateSelection();
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + resultsCount) % resultsCount;
        updateSelection();
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < resultsCount) {
          const selectedUrl = results[selectedIndex].querySelector('.url').textContent;
          chrome.runtime.sendMessage({ action: "openInNewTab", url: selectedUrl });
          closeBookmarkSearch();
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeBookmarkSearch();
        break;
    }
  });

  searchOverlay.addEventListener('click', function (e) {
    if (e.target === searchOverlay) {
      closeBookmarkSearch();
    }
  });

  chrome.runtime.sendMessage({ action: "getRecentBookmarks" }, function (bookmarks) {
    displayResults(bookmarks, '');
  });
}

function displayResults(results, query) {
  const resultsList = document.getElementById('results-list');
  resultsList.innerHTML = '';
  if (results.length === 0) {
    resultsList.innerHTML = '<li class="no-results">No results found</li>';
    return;
  }

  results.forEach(function (bookmark, index) {
    if (bookmark.url) {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="title">${highlightMatch(bookmark.title, query)}</div>
        <div class="url">${highlightMatch(bookmark.url, query)}</div>
      `;
      li.addEventListener('click', function () {
        chrome.runtime.sendMessage({ action: "openInNewTab", url: bookmark.url });
        closeBookmarkSearch();
      });
      li.addEventListener('mouseover', function () {
        selectedIndex = index;
        updateSelection();
      });
      resultsList.appendChild(li);
    }
  });
}

function updateSelection() {
  const results = document.querySelectorAll('#results-list li:not(.no-results)');
  results.forEach((result, index) => {
    if (index === selectedIndex) {
      result.classList.add('selected');
      result.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      result.classList.remove('selected');
    }
  });
}

function highlightMatch(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<strong>$1</strong>');
}

function closeBookmarkSearch() {
  console.log("Closing bookmark search overlay");
  if (searchOverlay) {
    document.body.removeChild(searchOverlay);
    searchOverlay = null;
    selectedIndex = -1;
    chrome.runtime.sendMessage({ action: "searchClosed" });
  }
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log("Message received in content script:", request);
  if (request.action === "openBookmarkSearch") {
    createBookmarkSearch();
  } else if (request.action === "closeBookmarkSearch") {
    closeBookmarkSearch();
  } else if (request.action === "checkSearchStatus") {
    sendResponse({ exists: !!searchOverlay });
  }
});

console.log("Content script setup complete");
