import maraiAPI from "@/apis/maraiAPI";
import React, { useState, useEffect, useRef } from 'react';
import { Play, Terminal, Clipboard, Check } from 'lucide-react';
import { toast } from "react-toastify";

const stripAnsiCodes = (text) => {
  // This regex removes the ANSI escape sequences used for color.
  return text.replace(/\u001b\[(?:\d{1,3}(?:;\d{1,3})*)?[m|K]/g, '');
};

const fetchTaskLog = (slug) => {
  console.log(`Fetching logs for slug: /tasks/${slug}/log`);
  return new Promise((resolve) => {
    setTimeout(() => {
      const rawLogText = MOCK_LOGS[slug] || '[ERROR] Log not found for the given slug.';
      // Split the raw text dump into an array of lines.
      const logsArray = rawLogText.split('\n');
      resolve(logsArray);
    }, 500 + Math.random() * 500);
  });
};

const LogLine = ({ text }) => {
    const [displayedText, setDisplayedText] = useState('');
    // Clean the ANSI codes for display, but keep the original for color logic
    const cleanText = stripAnsiCodes(text);
    // const cleanText = stripAnsiCodes(text);

    useEffect(() => {
        // let i = 0;
        // const typingInterval = setInterval(() => {
        //     if (i < cleanText.length) {
        //         setDisplayedText(cleanText.substring(0, i + 1));
        //         i++;
        //     } else {
        //         clearInterval(typingInterval);
        //     }
        // }, 10); // Adjust typing speed here

        // return () => clearInterval(typingInterval);

        setDisplayedText(cleanText);
    }, [cleanText]);

    // Function to apply colors based on log level by inspecting the raw line
    const applySyntaxHighlighting = (line) => {
        if (line.includes('SUCCESS') || line.includes('[SUCCESS]')) return 'text-green-400';
        if (line.includes('INFO') || line.includes('[INFO]')) return 'text-blue-400';
        if (line.includes('WARN') || line.includes('[WARN]')) return 'text-yellow-400';
        if (line.includes('ERROR') || line.includes('[ERROR]') || line.includes('DANGER') || line.includes('FATAL')) return 'text-red-400';
        if (line.includes('STACK')) return 'text-red-400';
        return 'text-gray-300';
    };

    return <div className={applySyntaxHighlighting(text)}>
      <span className="text-[10px]">{displayedText}</span>
    </div>;
};

export default function LogViewer ({ slug }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [currentLine, setCurrentLine] = useState(0);
  const [allLines, setAllLines] = useState([]);
  const logContainerRef = useRef(null);

  async function restartAnimation() {
    setIsLoading(true);
    setLogs([]);
    setCurrentLine(0);
    setAllLines([]);

    try {
      if (maraiAPI.getAuthToken() === "") { return }

      const response = await maraiAPI.getTaskLog({}, {
        slug: slug,
      })

      const body = await response.text()

      console.warn("body", body)

      if (response.status !== 200) {
        toast.error(`Gagal memuat log task: ${body}`)
        return
      }

      setAllLines(body.split('\n'))

      setIsLoading(false);

      setCurrentLine(0);

    } catch(e) {
      toast.error(`Error: ${e}`)
    }
  };

  useEffect(() => {
      restartAnimation();
  }, [slug]);

  useEffect(() => {
      if (!isLoading && currentLine < allLines.length) {
          const timer = setTimeout(() => {
              setLogs(prev => [...prev, allLines[currentLine]]);
              setCurrentLine(prev => prev + 1);
          }, 100 + Math.random() * 200); // Delay between lines
          return () => clearTimeout(timer);
      }
  }, [isLoading, currentLine, allLines]);


  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopy = () => {
    // Copy the cleaned text for better usability
    const logText = allLines.map(stripAnsiCodes).join('\n');
    const textarea = document.createElement('textarea');
    textarea.value = logText;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy logs: ', err);
    }
    document.body.removeChild(textarea);
  };

  return (
    <div className="w-full mx-auto bg-[#1a1b26] rounded-xl shadow-2xl overflow-hidden font-mono">
      {/* Terminal Header */}
      {/* <div className="bg-[#282a36] flex items-center justify-between px-4 py-2 text-gray-300">
        <div className="flex items-center space-x-2">
          <span className="h-3 w-3 bg-red-500 rounded-full"></span>
          <span className="h-3 w-3 bg-yellow-500 rounded-full"></span>
          <span className="h-3 w-3 bg-green-500 rounded-full"></span>
        </div>
        <div className="flex items-center space-x-2">
           <Terminal size={16} />
           <span className="text-sm">/tasks/{slug}/log</span>
        </div>
        <div className="flex items-center space-x-2">
            <button onClick={restartAnimation} className="text-gray-400 hover:text-white transition-colors duration-200" title="Replay Log">
                <Play size={16}/>
            </button>
            <button onClick={handleCopy} className="text-gray-400 hover:text-white transition-colors duration-200" title="Copy Log">
                {isCopied ? <Check size={16} className="text-green-400" /> : <Clipboard size={16} />}
            </button>
        </div>
      </div> */}

      {/* Log Content */}
      <div ref={logContainerRef} className="p-4 h-96 overflow-y-auto text-sm break-all leading-tight">
        {isLoading ? (
          <div className="flex items-center text-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-100 mr-2"></div>
            Fetching logs...
          </div>
        ) : (
          logs.map((line, index) => (
             <div key={index} className="flex flex-wrap">
                {/* <span className="text-gray-500 mr-4 select-none text-right w-8">{index + 1}</span> */}
                <LogLine text={line}/>
             </div>
          ))
        )}
        {/* {!isLoading && currentLine === allLines.length && (
             <div className="flex mt-2">
                <span className="text-gray-500 mr-4 select-none text-right w-8"></span>
                <div className="text-green-400">
                    <span className="animate-pulse">_</span>
                </div>
             </div>
        )} */}
      </div>
    </div>
  );
};
