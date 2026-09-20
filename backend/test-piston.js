fetch('https://emkc.org/api/v2/piston/execute', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    language: 'python',
    version: '*',
    files: [{content: 'print("hello piston")'}],
    stdin: ''
  })
}).then(r => r.json()).then(console.log);
