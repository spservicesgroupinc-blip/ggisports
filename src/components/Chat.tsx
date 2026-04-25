import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { fetchFromGas, gasAuth } from '../services/gasService';

interface Message {
  id: string;
  userId: string;
  fullName: string;
  text: string;
  timestamp: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const currentUserId = gasAuth.getUserId();

  const fetchMessages = async () => {
    try {
      const data = await fetchFromGas('getMessages');
      setMessages(data || []);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const textToSend = inputText;
    setInputText('');
    setIsSending(true);

    try {
      const fullName = gasAuth.getFullName();
      await fetchFromGas('sendMessage', { text: textToSend, fullName });
      await fetchMessages();
    } catch (err) {
      console.error('Failed to send message:', err);
      // Put message back if failed
      setInputText(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950">
      <header className="h-16 border-b border-neutral-800 flex items-center px-6 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <h2 className="text-lg font-semibold text-white">GGI Youth Sports Chat</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-neutral-500 mt-10">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === currentUserId;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-xs text-neutral-500 mb-1 px-1">
                  {msg.fullName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div 
                  className={`px-4 py-2.5 rounded-2xl max-w-[85%] sm:max-w-[75%] ${
                    isMe 
                      ? 'bg-cyan-600 text-white rounded-tr-sm' 
                      : 'bg-neutral-800 text-neutral-200 rounded-tl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-neutral-900 border-t border-neutral-800 pb-[72px] md:pb-4">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Write a message..."
            className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 rounded-full px-5 py-3 text-white text-sm outline-none transition-all"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white p-3 rounded-full transition-colors flex items-center justify-center shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
