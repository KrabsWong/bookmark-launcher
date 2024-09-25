document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('search-input');
  const resultsList = document.getElementById('results-list');

  searchInput.addEventListener('input', function () {
    const query = this.value.toLowerCase();
    chrome.bookmarks.search(query, function (results) {
      displayResults(results, query);
    });
  });

  function displayResults(results, query) {
    resultsList.innerHTML = '';
    if (results.length === 0) {
      resultsList.innerHTML = '<li class="no-results">No results found</li>';
      return;
    }

    results.forEach(function (bookmark) {
      if (bookmark.url) {
        const li = document.createElement('li');
        li.innerHTML = `
          <div>${highlightMatch(bookmark.title, query)}</div>
          <div class="url">${highlightMatch(bookmark.url, query)}</div>
        `;
        li.addEventListener('click', function () {
          chrome.tabs.create({ url: bookmark.url });
        });
        resultsList.appendChild(li);
      }
    });
  }

  function highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
  }

  // 初始加载时显示所有书签
  chrome.bookmarks.getRecent(100, function (bookmarks) {
    displayResults(bookmarks, '');
  });
});