const testUrl = async (url) => {
  const res = await fetch('http://localhost:3000/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  const data = await res.json();
  console.log(`\nURL: ${url}`);
  console.log(`Status: ${res.status}`);
  console.log(`Success: ${data.success}`);
  
  if (data.analysis) {
      console.log(`--- SUMMARY ---`);
      console.log(JSON.stringify(data.analysis.summary, null, 2));
      console.log(`--- FIRST 3 ISSUES ---`);
      console.log(JSON.stringify(data.analysis.issues.slice(0, 3), null, 2));
      console.log(`...and ${data.analysis.issues.length - 3} more issues`);
  } else if (data.error) {
      console.log(`Error: ${data.error}`);
  }
};

const runTests = async () => {
    try {
        console.log('Testing valid URL (https://example.com)...');
        await testUrl('https://example.com');
        
        console.log('\nALL TESTS COMPLETED');
    } catch(err) {
        console.error('Test script error:', err);
    }
};

setTimeout(runTests, 1000); // give server a second to start
