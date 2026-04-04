import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, CheckCircle, XCircle, AlertCircle, RotateCw, ThumbsUp, ThumbsDown } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: Date;
  score?: number;
  feedback?: 'positive' | 'negative' | null;
}

interface Assessment {
  id: string;
  question: string;
  userAnswer: string;
  expectedKeyPoints: string[];
  rubric: {
    criteria: string;
    points: number;
  }[];
}

const sampleAssessment: Assessment = {
  id: '1',
  question: 'Describe the incident response process for a data breach affecting 50,000 customer records. What are the critical steps and considerations?',
  userAnswer: '',
  expectedKeyPoints: [
    'Immediate containment and isolation',
    'Evidence preservation and forensics',
    'Stakeholder notification (management, legal, customers)',
    'Root cause analysis',
    'Remediation and prevention measures'
  ],
  rubric: [
    { criteria: 'Identifies immediate containment steps', points: 20 },
    { criteria: 'Discusses evidence preservation', points: 20 },
    { criteria: 'Addresses notification requirements', points: 20 },
    { criteria: 'Includes root cause analysis', points: 20 },
    { criteria: 'Proposes prevention measures', points: 20 }
  ]
};

export function AIGradingChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      content: 'Hello! I\'m your AI grading assistant. I\'ll help evaluate your response to the case study. Let\'s review your answer together. Would you like to submit your response now?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentAssessment, setCurrentAssessment] = useState<Assessment>(sampleAssessment);
  const [gradingPhase, setGradingPhase] = useState<'initial' | 'submitted' | 'grading' | 'complete'>('initial');
  const [totalScore, setTotalScore] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (content: string, sender: 'user' | 'ai', score?: number) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      sender,
      content,
      timestamp: new Date(),
      score
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const simulateAITyping = (responses: string[], delay: number = 1500) => {
    setIsTyping(true);
    
    responses.forEach((response, index) => {
      setTimeout(() => {
        addMessage(response, 'ai');
        if (index === responses.length - 1) {
          setIsTyping(false);
        }
      }, delay * (index + 1));
    });
  };

  const analyzeAnswer = (answer: string) => {
    const answerLower = answer.toLowerCase();
    const matchedPoints = currentAssessment.expectedKeyPoints.filter(point =>
      answerLower.includes(point.toLowerCase().split(' ').slice(0, 2).join(' '))
    );
    
    const baseScore = (matchedPoints.length / currentAssessment.expectedKeyPoints.length) * 80;
    const detailBonus = answer.length > 200 ? 10 : answer.length > 100 ? 5 : 0;
    const finalScore = Math.min(100, Math.round(baseScore + detailBonus));
    
    return { matchedPoints, finalScore };
  };

  const handleGradeSubmission = () => {
    if (!currentAssessment.userAnswer.trim()) {
      simulateAITyping(['Please provide your answer first before I can grade it.']);
      return;
    }

    setGradingPhase('grading');
    
    const responses = [
      '📝 Thank you for submitting your response. Let me analyze it carefully...',
      '🔍 I\'m evaluating your answer against the rubric criteria...',
    ];

    simulateAITyping(responses, 1500);

    setTimeout(() => {
      const { matchedPoints, finalScore } = analyzeAnswer(currentAssessment.userAnswer);
      setTotalScore(finalScore);
      
      const gradeResponses = [
        `✅ Analysis complete! Here's my evaluation:`,
        `**Overall Score: ${finalScore}/100**\n\n**Strengths identified:**\n${matchedPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}`,
      ];

      const missedPoints = currentAssessment.expectedKeyPoints.filter(
        point => !matchedPoints.includes(point)
      );

      if (missedPoints.length > 0) {
        gradeResponses.push(
          `**Areas for improvement:**\n${missedPoints.map((p, i) => `${i + 1}. Consider addressing: ${p}`).join('\n')}`
        );
      }

      if (finalScore >= 80) {
        gradeResponses.push('🎉 Excellent work! Your response demonstrates strong understanding of incident response procedures.');
      } else if (finalScore >= 60) {
        gradeResponses.push('👍 Good effort! You covered several key points. Review the areas for improvement to strengthen your response.');
      } else {
        gradeResponses.push('💡 Your response needs more detail. Review the case study and focus on the critical steps in incident response.');
      }

      setGradingPhase('complete');
      simulateAITyping(gradeResponses, 2000);
    }, 4000);
  };

  const handleRegenerateGrade = () => {
    setGradingPhase('grading');
    simulateAITyping([
      '🔄 Let me re-evaluate your response with a fresh perspective...',
    ], 1500);

    setTimeout(() => {
      const { matchedPoints, finalScore } = analyzeAnswer(currentAssessment.userAnswer);
      const adjustedScore = Math.min(100, finalScore + Math.floor(Math.random() * 5 - 2));
      setTotalScore(adjustedScore);
      
      simulateAITyping([
        `**Revised Score: ${adjustedScore}/100**\n\nAfter re-reviewing your response, I've considered additional aspects of your analysis. The core evaluation remains consistent with the rubric criteria.`
      ], 2000);
      
      setGradingPhase('complete');
    }, 3000);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    addMessage(userMessage, 'user');
    setInputValue('');

    if (gradingPhase === 'initial') {
      setCurrentAssessment({ ...currentAssessment, userAnswer: userMessage });
      setGradingPhase('submitted');
      
      simulateAITyping([
        'Great! I\'ve received your response. When you\'re ready, click "Grade My Response" and I\'ll provide detailed feedback based on the rubric criteria.'
      ]);
    } else if (gradingPhase === 'complete') {
      // Handle follow-up questions
      const lowerMessage = userMessage.toLowerCase();
      
      if (lowerMessage.includes('improve') || lowerMessage.includes('better')) {
        simulateAITyping([
          'To improve your score, I recommend:\n1. Address all key points from the rubric\n2. Provide specific examples and details\n3. Structure your response clearly\n4. Consider multiple perspectives on the incident response process'
        ]);
      } else if (lowerMessage.includes('why') || lowerMessage.includes('explain')) {
        simulateAITyping([
          'I evaluated your response based on the rubric criteria, checking for coverage of critical incident response steps like containment, evidence preservation, stakeholder communication, and prevention measures. Each criterion is weighted equally.'
        ]);
      } else {
        simulateAITyping([
          'I\'m here to help! You can ask me:\n- How to improve your score\n- Why you received this grade\n- Questions about specific rubric criteria\n- For clarification on any feedback'
        ]);
      }
    } else {
      simulateAITyping([
        'Please wait for the grading process to complete, or feel free to ask questions about the assessment.'
      ]);
    }
  };

  const handleFeedback = (messageId: string, type: 'positive' | 'negative') => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, feedback: type } : msg
    ));
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 60) return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-[700px]">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Grading Assistant</h3>
              <p className="text-sm text-gray-600">Interactive assessment evaluation</p>
            </div>
          </div>
          
          {totalScore !== null && (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
              {getScoreIcon(totalScore)}
              <span className={`text-lg font-bold ${getScoreColor(totalScore)}`}>
                {totalScore}/100
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Question Display */}
      <div className="p-4 bg-blue-50 border-b border-blue-200 flex-shrink-0">
        <p className="text-xs font-medium text-blue-700 mb-2">ASSESSMENT QUESTION</p>
        <p className="text-sm text-gray-800 leading-relaxed">{currentAssessment.question}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              message.sender === 'ai' 
                ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
                : 'bg-[#1e3a5f]'
            }`}>
              {message.sender === 'ai' ? (
                <Bot className="w-5 h-5 text-white" />
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </div>

            {/* Message Content */}
            <div className={`flex-1 max-w-[80%] ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-4 rounded-lg ${
                message.sender === 'ai'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-[#1e3a5f] text-white'
              }`}>
                <p className="text-sm whitespace-pre-line leading-relaxed">{message.content}</p>
              </div>
              
              {/* Timestamp and Feedback */}
              <div className="flex items-center gap-2 mt-1 px-2">
                <span className="text-xs text-gray-500">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                
                {message.sender === 'ai' && (
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

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="p-4 bg-gray-100 rounded-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Action Buttons */}
      {gradingPhase === 'submitted' && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            onClick={handleGradeSubmission}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            <Sparkles className="w-5 h-5" />
            Grade My Response
          </button>
        </div>
      )}

      {gradingPhase === 'complete' && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            onClick={handleRegenerateGrade}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            <RotateCw className="w-4 h-4" />
            Regenerate Grade
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={
              gradingPhase === 'initial' 
                ? 'Type your answer here...' 
                : 'Ask a question or request clarification...'
            }
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className="px-6 py-3 bg-[#1e3a5f] text-white rounded-lg font-medium hover:bg-[#152d4a] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
