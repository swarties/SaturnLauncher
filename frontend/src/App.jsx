import { useState } from 'react';
import './App.css';
import { Button } from '@/components/ui/button.jsx';

function App() {
  return (
    <div id="App" className={`flex h-screen items-center justify-center`}>
      <Button
        variant="outline"
        className={`flex h-fit w-fit rounded-lg border bg-black font-medium text-white hover:bg-white hover:text-black sm:w-auto`}
      >
        LOGIN
        <img
          className={`h-6 w-6`}
          src="https://cdn.jsdelivr.net/gh/selfhst/icons@main/svg/microsoft.svg"
          alt="microsoft icon"
        />
      </Button>
    </div>
  );
}

export default App;
