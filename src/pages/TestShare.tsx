import React from 'react';

const TestShare = () => {
  console.log('TestShare component rendering!');
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">🎉 Share Route Works!</h1>
        <p className="text-muted-foreground">You successfully accessed a public share route.</p>
        <p className="text-sm mt-2">Path: {window.location.pathname}</p>
      </div>
    </div>
  );
};

export default TestShare;