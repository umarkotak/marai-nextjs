// components/ReactPlayerClient.js
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ReactPlayer with SSR turned off
const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false });
// Using 'react-player/lazy' is recommended as it only loads the necessary player
// for the URL type, reducing bundle size. You can also use import('react-player').

const ReactPlayerClient = ({ url, ...props }) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    // You can return a loading skeleton or null here
    return <p>Loading player...</p>;
  }

  return (
    <div className="relative pt-[56.25%] rounded-lg overflow-hidden bg-black">
      <ReactPlayer
        className="absolute top-0 left-0"
        url={url}
        width="100%"
        height="100%"
        {...props}
      />
    </div>
  );
};

export default ReactPlayerClient;