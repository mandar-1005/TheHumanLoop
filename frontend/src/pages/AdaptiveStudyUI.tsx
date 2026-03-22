import { useState } from 'react';
import { BookOpen, CreditCard, FileText, ChevronLeft, ChevronRight, RotateCw, CheckCircle, RefreshCw, XCircle, AlertCircle, Sparkles } from 'lucide-react';

// Sample study content
const studyContent = {
  textGuides: [
    {
      id: 1,
      title: 'Access Control Fundamentals',
      sections: [
        {
          heading: 'What is Access Control?',
          content: 'Access control is a security technique that regulates who or what can view or use resources in a computing environment. It is a fundamental concept in security that minimizes risk to the business or organization.'
        },
        {
          heading: 'Types of Access Control',
          content: 'There are several types of access control including Mandatory Access Control (MAC), Discretionary Access Control (DAC), and Role-Based Access Control (RBAC). Each type serves different security needs and organizational structures.'
        },
        {
          heading: 'Best Practices',
          content: 'Implement the principle of least privilege, regularly review access permissions, use multi-factor authentication, and maintain detailed audit logs of access activities.'
        }
      ]
    },
    {
      id: 2,
      title: 'Incident Response Protocol',
      sections: [
        {
          heading: 'Detection Phase',
          content: 'The first step in incident response is detecting potential security incidents through monitoring systems, alerts, and user reports. Quick detection is crucial for minimizing damage.'
        },
        {
          heading: 'Containment Strategy',
          content: 'Once an incident is detected, immediate containment prevents further damage. This may involve isolating affected systems, disabling compromised accounts, or blocking malicious traffic.'
        },
        {
          heading: 'Recovery and Lessons',
          content: 'After containment, focus on recovery and restoration of normal operations. Conduct a post-incident review to identify lessons learned and improve future response.'
        }
      ]
    }
  ],
  flashcards: [
    {
      id: 1,
      front: 'What does RBAC stand for?',
      back: 'Role-Based Access Control - A method of regulating access to computer or network resources based on the roles of individual users within an organization.',
      assessment: true,
      expectedAnswer: 'Role-Based Access Control'
    },
    {
      id: 2,
      front: 'Define the Principle of Least Privilege',
      back: 'A security concept where users are granted the minimum levels of access necessary to complete their job functions, reducing the risk of unauthorized access.',
      assessment: true,
      expectedAnswer: 'minimum levels of access'
    },
    {
      id: 3,
      front: 'What are the three phases of incident response?',
      back: '1. Detection and Analysis\n2. Containment, Eradication, and Recovery\n3. Post-Incident Activity',
      assessment: true,
      expectedAnswer: 'Detection, Containment, Post-Incident'
    },
    {
      id: 4,
      front: 'What is Multi-Factor Authentication (MFA)?',
      back: 'A security system that requires more than one method of authentication from independent categories of credentials to verify the user\'s identity.',
      assessment: true,
      expectedAnswer: 'multiple authentication methods'
    },
    {
      id: 5,
      front: 'Define Security Incident',
      back: 'An event that actually or potentially jeopardizes the confidentiality, integrity, or availability of an information system or the information it processes, stores, or transmits.',
      assessment: true,
      expectedAnswer: 'event that jeopardizes security'
    }
  ],
  caseStudies: [
    {
      id: 1,
      title: 'Data Breach at TechCorp',
      scenario: 'TechCorp, a mid-sized software company, discovered that an unauthorized party accessed their customer database containing 50,000 user records. The breach was detected when unusual database queries were flagged by their monitoring system.',
      challenge: 'The security team needs to respond quickly to contain the breach, assess the damage, notify affected parties, and prevent future incidents.',
      questions: [
        'What should be the immediate first steps?',
        'Who needs to be notified and in what order?',
        'What evidence should be preserved?'
      ],
      solution: {
        steps: [
          'Immediately isolate the affected database server from the network',
          'Preserve all logs and system snapshots for forensic analysis',
          'Activate the incident response team and notify management',
          'Assess the scope of compromised data',
          'Notify affected customers and relevant authorities as required by law',
          'Conduct a thorough investigation to determine the attack vector',
          'Implement additional security controls to prevent recurrence'
        ],
        keyLearnings: [
          'Importance of real-time monitoring and alerting',
          'Need for a well-documented incident response plan',
          'Value of regular security audits and penetration testing'
        ]
      },
      keyPoints: ['isolate', 'preserve logs', 'notify', 'investigate', 'prevent']
    },
    {
      id: 2,
      title: 'Insider Threat at FinanceGlobal',
      scenario: 'A financial services company noticed that an employee was accessing sensitive customer financial data outside of their normal job responsibilities. The access patterns were detected through their data loss prevention (DLP) system.',
      challenge: 'How should the organization handle this potential insider threat while balancing employee privacy, legal considerations, and security needs?',
      questions: [
        'How do you investigate without alerting the employee?',
        'What legal considerations must be addressed?',
        'How can this be prevented in the future?'
      ],
      solution: {
        steps: [
          'Discreetly coordinate with HR and legal teams',
          'Monitor the employee\'s activities without tipping them off',
          'Gather evidence of unauthorized access',
          'Document all findings with timestamps and access logs',
          'Conduct a formal investigation with proper legal oversight',
          'Take appropriate disciplinary action based on findings',
          'Review and strengthen access control policies'
        ],
        keyLearnings: [
          'Implement strict role-based access controls',
          'Regular access reviews and audits are essential',
          'User behavior analytics can detect anomalies early',
          'Clear policies and employee training are preventive measures'
        ]
      },
      keyPoints: ['coordinate with HR/legal', 'gather evidence', 'formal investigation', 'strengthen controls']
    }
  ]
};

type StudyMode = 'guides' | 'flashcards' | 'cases';
type FeedbackStatus = 'correct' | 'partial' | 'incorrect' | null;

export function AdaptiveStudyUI() {
  const [studyMode, setStudyMode] = useState<StudyMode>('guides');
  const [currentGuideIndex, setCurrentGuideIndex] = useState(0);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  
  // New state for assessments
  const [userAnswer, setUserAnswer] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

  const modes = [
    { id: 'guides' as StudyMode, label: 'Text Guides', icon: BookOpen },
    { id: 'flashcards' as StudyMode, label: 'Flashcards', icon: CreditCard },
    { id: 'cases' as StudyMode, label: 'Case Studies', icon: FileText },
  ];

  // Simulate AI feedback generation
  const generateFeedback = (answer: string, context: 'flashcard' | 'case', expectedAnswer?: string, keyPoints?: string[]) => {
    setIsGeneratingFeedback(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const answerLower = answer.toLowerCase().trim();
      
      if (context === 'flashcard' && expectedAnswer) {
        const expectedLower = expectedAnswer.toLowerCase();
        const hasKeyTerms = expectedLower.split(' ').some(term => answerLower.includes(term));
        
        if (answerLower.includes(expectedLower) || (hasKeyTerms && answerLower.length > 10)) {
          setFeedbackStatus('correct');
          setFeedback('Excellent! Your answer demonstrates a strong understanding of the concept. You\'ve correctly identified the key components.');
        } else if (hasKeyTerms) {
          setFeedbackStatus('partial');
          setFeedback('Good effort! You\'ve touched on some important points, but your answer could be more complete. Consider including more specific details about the definition.');
        } else {
          setFeedbackStatus('incorrect');
          setFeedback('Not quite right. Review the material and focus on the core definition. Think about what makes this concept unique in security contexts.');
        }
      } else if (context === 'case' && keyPoints) {
        const matchedPoints = keyPoints.filter(point => 
          answerLower.includes(point.toLowerCase())
        );
        const percentage = matchedPoints.length / keyPoints.length;
        
        if (percentage >= 0.7) {
          setFeedbackStatus('correct');
          setFeedback(`Excellent analysis! You've identified ${matchedPoints.length} out of ${keyPoints.length} key action items. Your response shows strong incident response knowledge and practical thinking.`);
        } else if (percentage >= 0.4) {
          setFeedbackStatus('partial');
          setFeedback(`Good start! You've covered ${matchedPoints.length} important points. Consider also addressing: ${keyPoints.filter(p => !matchedPoints.includes(p)).slice(0, 2).join(', ')}. A comprehensive response should address immediate containment, evidence preservation, and stakeholder communication.`);
        } else {
          setFeedbackStatus('incorrect');
          setFeedback(`Your response needs more detail. Focus on the critical aspects of incident response: immediate containment, evidence preservation, proper notification procedures, and preventive measures. Review the case scenario and think through the complete lifecycle of an incident response.`);
        }
      }
      
      setIsGeneratingFeedback(false);
      setIsSubmitted(true);
    }, 1500);
  };

  const handleSubmitAnswer = () => {
    if (!userAnswer.trim()) return;
    
    if (studyMode === 'flashcards') {
      const currentCard = studyContent.flashcards[currentFlashcardIndex];
      generateFeedback(userAnswer, 'flashcard', currentCard.expectedAnswer);
    } else if (studyMode === 'cases') {
      const currentCase = studyContent.caseStudies[currentCaseIndex];
      generateFeedback(userAnswer, 'case', undefined, currentCase.keyPoints);
    }
  };

  const handleRegenerateFeedback = () => {
    if (studyMode === 'flashcards') {
      const currentCard = studyContent.flashcards[currentFlashcardIndex];
      generateFeedback(userAnswer, 'flashcard', currentCard.expectedAnswer);
    } else if (studyMode === 'cases') {
      const currentCase = studyContent.caseStudies[currentCaseIndex];
      generateFeedback(userAnswer, 'case', undefined, currentCase.keyPoints);
    }
  };

  const resetAssessment = () => {
    setUserAnswer('');
    setFeedbackStatus(null);
    setFeedback('');
    setIsSubmitted(false);
  };

  const handleNextFlashcard = () => {
    setIsFlipped(false);
    resetAssessment();
    setCurrentFlashcardIndex((prev) => 
      (prev + 1) % studyContent.flashcards.length
    );
  };

  const handlePrevFlashcard = () => {
    setIsFlipped(false);
    resetAssessment();
    setCurrentFlashcardIndex((prev) => 
      prev === 0 ? studyContent.flashcards.length - 1 : prev - 1
    );
  };

  const handleNextCase = () => {
    setShowSolution(false);
    resetAssessment();
    setCurrentCaseIndex((prev) => 
      (prev + 1) % studyContent.caseStudies.length
    );
  };

  const handlePrevCase = () => {
    setShowSolution(false);
    resetAssessment();
    setCurrentCaseIndex((prev) => 
      prev === 0 ? studyContent.caseStudies.length - 1 : prev - 1
    );
  };

  const getFeedbackIcon = () => {
    switch (feedbackStatus) {
      case 'correct':
        return <CheckCircle className="w-5 h-5" />;
      case 'partial':
        return <AlertCircle className="w-5 h-5" />;
      case 'incorrect':
        return <XCircle className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getFeedbackColor = () => {
    switch (feedbackStatus) {
      case 'correct':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'partial':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'incorrect':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return '';
    }
  };

  const getFeedbackIconColor = () => {
    switch (feedbackStatus) {
      case 'correct':
        return 'text-green-600';
      case 'partial':
        return 'text-yellow-600';
      case 'incorrect':
        return 'text-red-600';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Header with mode selector */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Adaptive Study Center</h3>
        <div className="flex gap-2">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                setStudyMode(mode.id);
                setIsFlipped(false);
                setShowSolution(false);
                resetAssessment();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                studyMode === mode.id
                  ? 'bg-[#1e3a5f] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <mode.icon className="w-4 h-4" />
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="p-6">
        {/* Text Guides View */}
        {studyMode === 'guides' && (
          <div className="space-y-6">
            {/* Guide selector */}
            <div className="flex gap-2">
              {studyContent.textGuides.map((guide, index) => (
                <button
                  key={guide.id}
                  onClick={() => setCurrentGuideIndex(index)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentGuideIndex === index
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {guide.title}
                </button>
              ))}
            </div>

            {/* Guide content */}
            <div className="space-y-6">
              {studyContent.textGuides[currentGuideIndex].sections.map((section, index) => (
                <div key={index} className="space-y-3">
                  <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#1e3a5f] text-white text-xs">
                      {index + 1}
                    </span>
                    {section.heading}
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed pl-8">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Mark as completed</span>
              </div>
            </div>
          </div>
        )}

        {/* Flashcards View */}
        {studyMode === 'flashcards' && (
          <div className="space-y-6">
            <div className="text-center text-sm text-gray-600 mb-4">
              Card {currentFlashcardIndex + 1} of {studyContent.flashcards.length}
            </div>

            {/* Flashcard */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="relative h-80 cursor-pointer perspective-1000"
            >
              <div
                className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* Front of card */}
                <div
                  className="absolute w-full h-full backface-hidden bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] rounded-xl p-8 flex items-center justify-center"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="text-center">
                    <p className="text-sm text-blue-200 mb-4">QUESTION</p>
                    <p className="text-xl text-white font-medium">
                      {studyContent.flashcards[currentFlashcardIndex].front}
                    </p>
                    <p className="text-sm text-blue-200 mt-8">Click to reveal answer</p>
                  </div>
                </div>

                {/* Back of card */}
                <div
                  className="absolute w-full h-full backface-hidden bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-8 flex items-center justify-center"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <div className="text-center">
                    <p className="text-sm text-green-200 mb-4">ANSWER</p>
                    <p className="text-lg text-white whitespace-pre-line">
                      {studyContent.flashcards[currentFlashcardIndex].back}
                    </p>
                    <p className="text-sm text-green-200 mt-8">Click to see question</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={handlePrevFlashcard}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1e3a5f] border border-[#1e3a5f] rounded-lg hover:bg-[#1e3a5f] hover:text-white transition-colors"
              >
                <RotateCw className="w-4 h-4" />
                Flip Card
              </button>

              <button
                onClick={handleNextFlashcard}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Assessment */}
            {studyContent.flashcards[currentFlashcardIndex].assessment && (
              <div className="space-y-4 mt-6 pt-6 border-t-2 border-gray-200">
                <p className="text-sm font-semibold text-gray-900">📝 Test Your Knowledge</p>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-700 mb-2">YOUR ANSWER</p>
                  <textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    disabled={isSubmitted}
                    className={`w-full h-24 p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm ${
                      isSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    placeholder="Type your answer here..."
                  />
                </div>

                {!isSubmitted ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!userAnswer.trim()}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      userAnswer.trim()
                        ? 'bg-[#1e3a5f] text-white hover:bg-[#152d4a]'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Submit Answer
                  </button>
                ) : (
                  <button
                    onClick={resetAssessment}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <RotateCw className="w-4 h-4" />
                    Try Again
                  </button>
                )}

                {isGeneratingFeedback && (
                  <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <Sparkles className="w-5 h-5 text-blue-600 animate-spin" />
                    <span className="text-sm font-medium text-blue-700">Generating AI Feedback...</span>
                  </div>
                )}

                {isSubmitted && feedbackStatus && !isGeneratingFeedback && (
                  <div className={`p-4 border-2 rounded-lg ${getFeedbackColor()}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className={getFeedbackIconColor()}>
                        {getFeedbackIcon()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold mb-1">
                          {feedbackStatus === 'correct' && '✅ Excellent Work!'}
                          {feedbackStatus === 'partial' && '⚠️ Partially Correct'}
                          {feedbackStatus === 'incorrect' && '❌ Needs Improvement'}
                        </p>
                        <p className="text-sm leading-relaxed">{feedback}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleRegenerateFeedback}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Regenerate Feedback
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Case Studies View */}
        {studyMode === 'cases' && (
          <div className="space-y-6">
            <div className="text-center text-sm text-gray-600 mb-4">
              Case Study {currentCaseIndex + 1} of {studyContent.caseStudies.length}
            </div>

            <div className="space-y-6">
              {/* Case title */}
              <div>
                <h4 className="text-xl font-semibold text-gray-900">
                  {studyContent.caseStudies[currentCaseIndex].title}
                </h4>
              </div>

              {/* Scenario */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs font-medium text-blue-700 mb-2">SCENARIO</p>
                <p className="text-sm text-gray-800 leading-relaxed">
                  {studyContent.caseStudies[currentCaseIndex].scenario}
                </p>
              </div>

              {/* Challenge */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-xs font-medium text-amber-700 mb-2">CHALLENGE</p>
                <p className="text-sm text-gray-800 leading-relaxed">
                  {studyContent.caseStudies[currentCaseIndex].challenge}
                </p>
              </div>

              {/* Questions */}
              <div>
                <p className="text-xs font-medium text-gray-700 mb-3">KEY QUESTIONS TO CONSIDER</p>
                <ul className="space-y-2">
                  {studyContent.caseStudies[currentCaseIndex].questions.map((question, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-[#1e3a5f] font-bold">{index + 1}.</span>
                      {question}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Solution (toggleable) */}
              {!showSolution ? (
                <button
                  onClick={() => setShowSolution(true)}
                  className="w-full px-4 py-3 bg-[#1e3a5f] text-white rounded-lg font-medium hover:bg-[#152d4a] transition-colors"
                >
                  Show Solution
                </button>
              ) : (
                <div className="space-y-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-green-700">RECOMMENDED SOLUTION</p>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-2">Action Steps:</p>
                    <ol className="space-y-2">
                      {studyContent.caseStudies[currentCaseIndex].solution.steps.map((step, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-600 text-white text-xs flex-shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="pt-3 border-t border-green-200">
                    <p className="text-sm font-medium text-gray-900 mb-2">Key Learnings:</p>
                    <ul className="space-y-1">
                      {studyContent.caseStudies[currentCaseIndex].solution.keyLearnings.map((learning, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          {learning}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                onClick={handlePrevCase}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous Case
              </button>

              <button
                onClick={handleNextCase}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Next Case
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Assessment */}
            {studyContent.caseStudies[currentCaseIndex].keyPoints && (
              <div className="space-y-4 mt-6 pt-6 border-t-2 border-gray-200">
                <p className="text-sm font-semibold text-gray-900">📝 Test Your Analysis Skills</p>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-700 mb-2">YOUR RESPONSE</p>
                  <textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    disabled={isSubmitted}
                    className={`w-full h-32 p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm ${
                      isSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    placeholder="Provide your detailed analysis and recommended actions..."
                  />
                </div>

                {!isSubmitted ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!userAnswer.trim()}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      userAnswer.trim()
                        ? 'bg-[#1e3a5f] text-white hover:bg-[#152d4a]'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Submit Response
                  </button>
                ) : (
                  <button
                    onClick={resetAssessment}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <RotateCw className="w-4 h-4" />
                    Try Again
                  </button>
                )}

                {isGeneratingFeedback && (
                  <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <Sparkles className="w-5 h-5 text-blue-600 animate-spin" />
                    <span className="text-sm font-medium text-blue-700">Analyzing Your Response...</span>
                  </div>
                )}

                {isSubmitted && feedbackStatus && !isGeneratingFeedback && (
                  <div className={`p-4 border-2 rounded-lg ${getFeedbackColor()}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className={getFeedbackIconColor()}>
                        {getFeedbackIcon()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold mb-1">
                          {feedbackStatus === 'correct' && '✅ Excellent Analysis!'}
                          {feedbackStatus === 'partial' && '⚠️ Good Start - Needs More Detail'}
                          {feedbackStatus === 'incorrect' && '❌ Incomplete Response'}
                        </p>
                        <p className="text-sm leading-relaxed">{feedback}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleRegenerateFeedback}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Regenerate Feedback
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}