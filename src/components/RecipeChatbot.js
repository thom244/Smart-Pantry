import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

const RecipeChatbot = ({ initiallyExpanded = false }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Hi! I\'m your cooking assistant. Ask me anything about recipes, cooking tips, or ingredient substitutions!'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pantryItems, setPantryItems] = useState([]);
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [streamingMessage, setStreamingMessage] = useState('');
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  useEffect(() => {
    fetchPantryItems();
  }, []);

  // Update expanded state when prop changes
  useEffect(() => {
    if (initiallyExpanded) {
      setIsExpanded(true);
    }
  }, [initiallyExpanded]);

  const fetchPantryItems = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const pantryRef = collection(db, 'users', user.uid, 'pantry');
      const snapshot = await getDocs(pantryRef);
      const items = snapshot.docs.map(doc => doc.data().name);
      setPantryItems(items);
    } catch (error) {
      console.error('Error fetching pantry:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    setStreamingMessage('');

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('http://localhost:5000/api/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userMessage,
          context: pantryItems
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Stream finished - add final message
          if (accumulatedText) {
            // eslint-disable-next-line no-loop-func
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: accumulatedText
            }]);
          }
          setStreamingMessage('');
          break;
        }

        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        // eslint-disable-next-line no-loop-func
        lines.forEach(line => {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.text) {
                accumulatedText += data.text;
                setStreamingMessage(accumulatedText);
              }

              if (data.done) {
                setStreamingMessage('');
              }


              if (data.error) {
                throw new Error(data.error);
              }
            } catch (parseError) {
              // Skip invalid JSON
            }
          }
        });
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }

      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Sorry, I couldn't get a response. ${error.message === 'Failed to fetch' ? 'Make sure the backend server is running.' : error.message}`
      }]);
      setStreamingMessage('');
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      setStreamingMessage('');
    }
  };

  const suggestedQuestions = [
    "What can I cook with my pantry items?",
    "Suggest a quick dinner recipe",
    "How do I substitute butter in baking?",
    "What's a good vegetarian protein?"
  ];

  const handleSuggestedQuestion = (question) => {
    setInput(question);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div
        className="bg-gradient-to-r from-green-600 to-green-700 dark:from-emerald-600 dark:to-emerald-700 p-4 flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="text-3xl">🤖</div>
          <div>
            <h3 className="text-white font-bold text-lg">Cooking Assistant</h3>
            <p className="text-green-100 text-sm">
              {loading ? 'Thinking...' : 'Powered by AI'}
            </p>
          </div>
        </div>
        <button className="text-white text-2xl hover:scale-110 transition">
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {/* Chat Area */}
      {isExpanded && (
        <div className="flex flex-col h-[500px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === 'user'
                    ? 'bg-green-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
                    }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {/* Streaming Message */}
            {streamingMessage && (
              <div className="flex justify-start">
                <div className="max-w-[80%] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
                  <p className="whitespace-pre-wrap">{streamingMessage}</p>
                  <div className="inline-block w-2 h-4 bg-green-600 ml-1 animate-pulse"></div>
                </div>
              </div>
            )}

            {/* Loading Indicator (only when waiting for first response) */}
            {loading && !streamingMessage && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {messages.length === 1 && !loading && (
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Try asking:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="text-left text-sm bg-gray-100 dark:bg-gray-700 hover:bg-green-100 dark:hover:bg-emerald-900/30 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg transition"
                  >
                    💡 {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about cooking..."
                disabled={loading}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-600"
              />
              {loading ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-semibold transition"
                >
                  Stop
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              )}
            </div>
            {pantryItems.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                💡 I can see you have {pantryItems.length} ingredients in your pantry
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  );
};

export default RecipeChatbot;