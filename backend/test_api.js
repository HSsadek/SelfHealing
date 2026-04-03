const testUrl = async (url) => {
  const res = await fetch('http://localhost:3000/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  const data = await res.json();
  console.log(`URL: ${url}`);
  console.log(`Status: ${res.status}`);
  console.log(`Success: ${data.success}`);
  if (data.html) console.log(`HTML Length: ${data.html.length}`);
  if (data.error) console.log(`Error: ${data.error}`);
  console.log('---');
};

const runTests = async () => {
    try {
        console.log('Testing valid URL (https://example.com)...');
        await testUrl('https://example.com');
        
        console.log('Testing invalid URL (not-a-url)...');
        await testUrl('not-a-url');
        
        console.log('ALL TESTS COMPLETED');
    } catch(err) {
        console.error('Test script error:', err);
    }
};

// Wait a bit for the server to start before running
setTimeout(runTests, 1000);
