import React from 'react';

const TestPage = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Test Page Works!</h1>
      <p>If you can see this, React is working.</p>
      <button onClick={() => alert('Button works!')}>
        Click me
      </button>
    </div>
  );
};

export default TestPage;