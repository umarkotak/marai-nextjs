import maraiAPI from "@/apis/maraiAPI";
import MovieTimeline from "@/components/MovieTimeline";
import TranscriptTimeline from "@/components/TranscriptTimeline";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftIcon, DownloadIcon, SettingsIcon, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Ollama } from 'ollama/browser'
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useSidebar } from "@/components/ui/sidebar";
import Link from "next/link";

var OLLAMA_HOST = "https://marllma.cloudflare-avatar-id-1.site"
// var OLLAMA_HOST = "http://127.0.0.1:11434"

export default function TaskTranscripting() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [taskDetail, setTaskDetail] = useState({})
  const [transcriptInfo, setTranscriptInfo] = useState(
    {
      duration_ms: 60000
    }
  )
  const [activeTranscriptLine, setActiveTranscriptLine] = useState({})
  const { open } = useSidebar()

  async function GetTaskDetail(slug) {
    try {
      if (maraiAPI.getAuthToken() === "") { return }

      const response = await maraiAPI.getTaskDetail({}, {
        slug: slug
      })

      const body = await response.json()

      if (response.status !== 200) {
        toast.error(`Gagal memuat task detail: ${JSON.stringify(body)}`)
        return
      }

      setTaskDetail(body.data)

    } catch(e) {
      toast.error(`Error: ${e}`)
    }
  }

  async function GetTranscriptInfo(slug) {
    if (!slug) { return }

    try {
      if (maraiAPI.getAuthToken() === "") { return }

      const response = await maraiAPI.getTranscriptInfo({}, {
        slug: slug
      })

      const body = await response.json()

      if (response.status !== 200) {
        toast.error(`Gagal memuat task transcript info: ${JSON.stringify(body)}`)
        return
      }

      setTranscriptInfo(body.data)

    } catch(e) {
      toast.error(`Error: ${e}`)
    }
  }

  useEffect(() => {
    if (!router.query.slug) { return }

    GetTaskDetail(router.query.slug)
    GetTranscriptInfo(router.query.slug)
  }, [router])

  return (
    <div className="w-full">
      <div className="flex flex-col gap-2 w-full justify-between">
        <div className="flex-1 grid grid-cols-12 gap-x-2">
          <div className="col-span-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1">
                <Link href="/tasks"><Button size="icon_7" variant="outline" ><ArrowLeftIcon /></Button></Link>
                <span>Transcript: {taskDetail?.name}</span>
              </div>
              <div>
                <Button size="icon_7" onClick={() => {}}><SettingsIcon /></Button>
              </div>
            </div>
            <div className="flex flex-col gap-2 font-mono h-[calc(100vh-370px)] overflow-auto">
              {transcriptInfo?.transcript?.transcript_lines?.map((transcriptLine) => (
                <div
                  key={`transcript-segment-${transcriptLine.id}`}
                  className={`bg-muted p-2 text-xs cursor-pointer ${activeTranscriptLine?.id === transcriptLine.id ? "border border-green-500" : ""}`}
                  onClick={() => setActiveTranscriptLine(transcriptLine)}
                >
                  <span className="mr-2 bg-background p-0.5">{transcriptLine?.start_at?.substr(3).slice(0,-4)}</span>
                  { transcriptLine?.speaker?.includes("SPEAKER") &&
                    <span className="mr-2 bg-background p-0.5">{transcriptLine?.speaker}</span>
                  }
                  <span>{transcriptLine?.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-8">
            <div className="border h-[calc(100vh-330px)] overflow-auto">
              <ChatApp
                taskDetail={taskDetail}
                transcriptInfo={transcriptInfo}
                slug={router.query.slug}
              />
            </div>
          </div>
        </div>

        <div className={`flex-none transition-all ${open ? "w-[calc(100vw-240px)]" : "w-[calc(100vw-65px)]"}`}>
          <TranscriptTimeline
            taskDetail={taskDetail}
            transcriptInfo={transcriptInfo}
            activeTranscriptLine={activeTranscriptLine}
            setActiveTranscriptLine={setActiveTranscriptLine}
          />
        </div>
      </div>
    </div>
  );
}

function ChatApp({ taskDetail, transcriptInfo, slug }) {
  function generateTranscriptData(transcriptInfo) {
    var transcriptText = ""

    transcriptInfo?.transcript?.transcript_lines?.map((tl) => {
      transcriptText = `${transcriptText}${tl.value}\n`
    })

    return transcriptText
  }

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const ollama = new Ollama({ host: OLLAMA_HOST })

  // Generate storage key based on slug
  const getStorageKey = () => `chat_${slug}`;

  // Save messages to localStorage
  const saveToStorage = (messages, history) => {
    if (!slug) return;

    try {
      const chatData = {
        messages: messages,
        conversationHistory: history,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(getStorageKey(), JSON.stringify(chatData));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  // Load messages from localStorage
  const loadFromStorage = () => {
    if (!slug) return null;

    try {
      const stored = localStorage.getItem(getStorageKey());
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return null;
    }
  };

  // Delete chat from localStorage
  const deleteChatHistory = () => {
    if (!slug) return;

    try {
      localStorage.removeItem(getStorageKey());
      setMessages([{
        id: 0,
        text: "Halo! Saya siap membantu Anda menganalisis transcript ini. Silakan tanyakan apa saja yang ingin Anda ketahui!",
        sender: "bot",
        timestamp: new Date(),
        show: true,
      }]);

      if (transcriptInfo?.transcript?.transcript_lines?.length > 0) {
        const transcriptData = generateTranscriptData(transcriptInfo);
        const systemMessage = {
          role: 'system',
          content: `Anda adalah asisten AI yang membantu menganalisis transcript. Berikut adalah transcript yang akan dianalisis: ${transcriptData}. Jawab pertanyaan berdasarkan transcript ini dalam bahasa Indonesia.`
        };
        setConversationHistory([systemMessage]);
      }

      toast.success("Riwayat chat berhasil dihapus");
    } catch (error) {
      console.error('Error deleting chat history:', error);
      toast.error("Gagal menghapus riwayat chat");
    }
  };

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Initialize conversation with transcript context
  useEffect(() => {
    if (transcriptInfo?.transcript?.transcript_lines?.length > 0 && slug) {
      const transcriptData = generateTranscriptData(transcriptInfo);
      const systemMessage = {
        role: 'system',
        content: `Anda adalah asisten AI yang membantu menganalisis transcript. Berikut adalah transcript yang akan dianalisis: ${transcriptData}. Jawab pertanyaan berdasarkan transcript ini dalam bahasa Indonesia.`
      };

      // Try to load existing chat
      const savedChat = loadFromStorage();

      if (savedChat && savedChat.messages && savedChat.conversationHistory) {
        setMessages(savedChat.messages);
        setConversationHistory(savedChat.conversationHistory);
      } else {
        // Initialize new chat
        setConversationHistory([systemMessage]);
        const initialMessages = [{
          id: 0,
          text: "Halo! Saya siap membantu Anda menganalisis transcript ini. Silakan tanyakan apa saja yang ingin Anda ketahui!",
          sender: "bot",
          timestamp: new Date(),
          show: true,
        }];
        setMessages(initialMessages);
        saveToStorage(initialMessages, [systemMessage]);
      }
    }
  }, [transcriptInfo, slug]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save to storage when messages or conversation history changes
  useEffect(() => {
    if (messages.length > 0 && conversationHistory.length > 0) {
      saveToStorage(messages, conversationHistory);
    }
  }, [messages, conversationHistory]);

  const handleSendMessage = async () => {
    if (inputValue.trim() === "" || isLoading) return;

    const userMessage = inputValue.trim();
    const newUserMessage = {
      id: Date.now(),
      text: userMessage,
      sender: "user",
      timestamp: new Date(),
      show: true
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      // Add user message to conversation history
      const updatedHistory = [
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      // Call Ollama API
      const response = await ollama.chat({
        model: 'gemma3:latest',
        messages: updatedHistory,
        stream: false,
      });

      const botMessage = {
        id: Date.now() + 1,
        text: response.message.content,
        sender: "bot",
        timestamp: new Date(),
        show: true
      };

      const finalMessages = [...updatedMessages, botMessage];
      setMessages(finalMessages);

      // Update conversation history with bot response
      const finalHistory = [
        ...updatedHistory,
        { role: 'assistant', content: response.message.content }
      ];
      setConversationHistory(finalHistory);

    } catch (error) {
      console.error("Error calling Ollama:", error);

      const errorMessage = {
        id: Date.now() + 1,
        text: `Maaf, terjadi kesalahan saat memproses permintaan Anda. Pastikan Ollama server berjalan di ${OLLAMA_HOST}`,
        sender: "bot",
        timestamp: new Date(),
        show: true
      };

      setMessages(prev => [...prev, errorMessage]);
      toast.error("Error connecting to Ollama server");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Custom markdown components
  const markdownComponents = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';

      return !inline && language ? (
        <SyntaxHighlighter
          style={tomorrow}
          language={language}
          PreTag="div"
          className="rounded-md text-sm"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={`${className} bg-gray-100 px-1 py-0.5 rounded text-sm`} {...props}>
          {children}
        </code>
      );
    },
    p: ({ children }) => <p className="text-sm mb-2 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
    li: ({ children }) => <li className="mb-1">{children}</li>,
    h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
    h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
    h3: ({ children }) => <h3 className="text-md font-bold mb-2">{children}</h3>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 italic mb-2">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto mb-2">
        <table className="min-w-full border-collapse border border-gray-300">
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border border-gray-300 px-2 py-1 bg-gray-100 font-semibold text-left">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-gray-300 px-2 py-1">{children}</td>
    ),
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Chat Header with Delete Button */}
      <div className="flex justify-between items-center px-2 border-b">
        <span className="text-sm font-medium">Chat Assistant</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={deleteChatHistory}
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Hapus Chat
        </Button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4 pb-20">
            {messages.filter((m) => m.show).map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.sender === 'bot' && (
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback>
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={`max-w-[75%] rounded-lg px-4 py-3 ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.sender === 'bot' ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {message.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  )}

                  <p className={`text-xs mt-2 ${
                    message.sender === 'user'
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground'
                  }`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>

                {message.sender === 'user' && (
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback>
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback>
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}

            {/* Invisible element for auto-scroll */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Fixed Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-background border-t p-2">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tanyakan sesuatu tentang transcript..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={inputValue.trim() === "" || isLoading}
            size="icon"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

const formatTime = (date) => {
  if (!date) { return "" }
  try {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch(e) {
    var date = new Date()
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
};
