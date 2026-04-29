import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';

const CHAT_API = 'http://127.0.0.1:8000/chat/ask';

interface Message {
    id: string;
    sender: 'user' | 'ai';
    content: string;
    timestamp: Date;
    feedback?: 'positive' | 'negative' | null;
}

interface StudyChatProps {
    studyGuide: string;
    role: string;
}

export default function StudyChat({ studyGuide, role }: StudyChatProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            sender: 'ai',
            content: `Hi! I'm your AI assistant for this ${role} training module. Ask me anything — I'll answer based on the training content, help you understand FedRAMP controls, and explain security concepts from the study guide. What would you like to know?`,
            timestamp: new Date(),
        },
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        const text = inputValue.trim();
        if (!text || isTyping) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            sender: 'user',
            content: text,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        const history = messages
            .filter(m => m.id !== '1')
            .map(m => ({
                role: m.sender === 'user' ? 'user' : 'assistant',
                content: m.content,
            }));

        try {
            const res = await fetch(CHAT_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    study_guide: studyGuide,
                    role,
                    conversation_history: history,
                }),
            });

            if (!res.ok) throw new Error('Chat request failed');

            const data = await res.json();
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                content: data.reply || "I couldn't generate a response. Please try again.",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch {
            setMessages(prev => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    sender: 'ai',
                    content: 'Sorry, I couldn\'t reach the study assistant right now. Please make sure the backend server is running and try again.',
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleFeedback = (messageId: string, type: 'positive' | 'negative') => {
        setMessages(prev =>
            prev.map(msg =>
                msg.id === messageId ? { ...msg, feedback: type } : msg,
            ),
        );
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-[700px]">
            {/* Header */}
            <div className="p-5 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">AI Chat</h3>
                        <p className="text-sm text-gray-500">Ask questions about your training module</p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map(message => (
                    <div
                        key={message.id}
                        className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                        <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                message.sender === 'ai'
                                    ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                                    : 'bg-[#1e3a5f]'
                            }`}
                        >
                            {message.sender === 'ai' ? (
                                <Bot className="w-5 h-5 text-white" />
                            ) : (
                                <User className="w-5 h-5 text-white" />
                            )}
                        </div>

                        <div className={`flex-1 max-w-[80%] ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                            <div
                                className={`p-4 rounded-lg ${
                                    message.sender === 'ai'
                                        ? 'bg-gray-100 text-gray-800'
                                        : 'bg-[#1e3a5f] text-white'
                                }`}
                            >
                                <p className="text-sm whitespace-pre-line leading-relaxed">{message.content}</p>
                            </div>

                            <div className="flex items-center gap-2 mt-1 px-2">
                                <span className="text-xs text-gray-500">
                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {message.sender === 'ai' && message.id !== '1' && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleFeedback(message.id, 'positive')}
                                            className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                                                message.feedback === 'positive' ? 'text-green-600' : 'text-gray-400'
                                            }`}
                                        >
                                            <ThumbsUp className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => handleFeedback(message.id, 'negative')}
                                            className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                                                message.feedback === 'negative' ? 'text-red-600' : 'text-gray-400'
                                            }`}
                                        >
                                            <ThumbsDown className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div className="p-4 bg-gray-100 rounded-lg">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 flex-shrink-0">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Ask about the study guide..."
                        disabled={isTyping}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isTyping}
                        className="px-6 py-3 bg-[#1e3a5f] text-white rounded-lg font-medium hover:bg-[#152d4a] transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-slate-700 dark:disabled:text-slate-500 flex items-center gap-2"
                    >
                        <Send className="w-4 h-4" />
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}