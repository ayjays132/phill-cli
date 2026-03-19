const duckDuckGoSearch = require('duckduckgo-search');

(async () => {
  try {
    console.log('Text search results:');
    const results = [];
    for await (const result of duckDuckGoSearch.text('web development tips')) {
      results.push(result);
      if (results.length >= 3) break;
    }
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
})();
