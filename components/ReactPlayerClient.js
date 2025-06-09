// components/ReactPlayerClient.js
import React, { useState, useEffect, useRef } from 'react';
// import dynamic from 'next/dynamic';

// Dynamically import ReactPlayer with SSR turned off
// const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });
import ReactPlayer from "react-player/lazy";
// Using 'react-player/lazy' is recommended as it only loads the necessary player
// for the URL type, reducing bundle size. You can also use import('react-player').

const ReactPlayerClient = ({ playerRef, url, ...props }) => {
  return (
    <div className="relative pt-[56.25%] rounded-lg overflow-hidden bg-black">
      <ReactPlayer
        ref={playerRef}
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