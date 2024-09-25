console.log("Content script loaded");

let searchOverlay = null;
let selectedIndex = -1;

// 添加一个函数来重置状态
function resetState() {
  searchOverlay = null;
  selectedIndex = -1;
}

// 修改 createBookmarkSearch 函数
function createBookmarkSearch() {
  // 如果 searchOverlay 已存在，先移除它
  if (searchOverlay) {
    closeBookmarkSearch();
  }

  console.log("Creating bookmark search overlay");

  searchOverlay = document.createElement('div');
  searchOverlay.className = '__bookmark__launcher__overlay__';
  searchOverlay.innerHTML = `
    <div class="__bookmark__launcher__container__">
      <input type="text" class="__bookmark__launcher__search__input__" placeholder="Search bookmarks...">
      <ul class="__bookmark__launcher__results__list__"></ul>
    </div>
  `;
  document.body.appendChild(searchOverlay);

  const searchInput = searchOverlay.querySelector('.__bookmark__launcher__search__input__');
  const resultsList = searchOverlay.querySelector('.__bookmark__launcher__results__list__');

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
          const selectedUrl = results[selectedIndex].querySelector('.__bookmark__launcher__url__').textContent;
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

// 修改 closeBookmarkSearch 函数
function closeBookmarkSearch() {
  console.log("Closing bookmark search overlay");
  if (searchOverlay && searchOverlay.parentNode) {
    searchOverlay.parentNode.removeChild(searchOverlay);
  }
  resetState();
  chrome.runtime.sendMessage({ action: "searchClosed" });
}

function displayResults(results, query) {
  const resultsList = searchOverlay.querySelector('.__bookmark__launcher__results__list__');
  resultsList.innerHTML = '';
  if (results.length === 0) {
    resultsList.innerHTML = '<li class="__bookmark__launcher__no__results__">No results found</li>';
    return;
  }

  results.forEach(function (bookmark, index) {
    if (bookmark.url) {
      const li = document.createElement('li');
      li.className = '__bookmark__launcher__result__item__';
      li.innerHTML = `
        <div class="__bookmark__launcher__title__">${highlightMatch(bookmark.title, query)}</div>
        <div class="__bookmark__launcher__url__">${highlightMatch(bookmark.url, query)}</div>
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
  const results = searchOverlay.querySelectorAll('.__bookmark__launcher__result__item__');
  results.forEach((result, index) => {
    if (index === selectedIndex) {
      result.classList.add('__bookmark__launcher__selected__');
      result.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      result.classList.remove('__bookmark__launcher__selected__');
    }
  });
}

function highlightMatch(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<strong>$1</strong>');
}

// 修改消息监听器
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

// 在页面加载时重置状态
resetState();

console.log("Content script setup complete");
