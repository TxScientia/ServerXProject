import { useEffect, useState } from 'react';

function App() {
  const [ping, setPing] = useState<string | null>(null);

  useEffect(() => {
    fetch('/ping')
      .then((res) => res.json())
      .then((data) => setPing(data.message))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Frontend ↔ Backend Test</h1>
      <p>{ping ? `Backend says: ${ping}` : 'Loading...'}</p>
    </div>
  );
}

export default App;
