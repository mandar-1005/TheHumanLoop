import { AlertTriangle, CheckCircle, Shield } from 'lucide-react';

export interface ModerationResult {
  isClean: boolean;
  flaggedCategories: string[];
  severity: 'low' | 'medium' | 'high' | null;
  filteredText?: string;
  warnings: string[];
}

/**
 * Content Moderation Filter
 * Filters AI-generated outputs for inappropriate content, bias, and harmful language
 */
export class ContentModerationFilter {
  // Harmful content patterns
  private static readonly PROFANITY_PATTERNS = [
    /\b(fuck|shit|damn|hell|ass|bitch|bastard|crap)\b/gi,
    /\b(wtf|stfu|fck|sh\*t|f\*ck)\b/gi,
  ];

  private static readonly BIAS_PATTERNS = [
    // Gender bias
    /\b(men are|women are|girls are|boys are)\s+(better|worse|smarter|dumber|superior|inferior)/gi,
    // Racial/ethnic bias
    /\b(always|never|all)\s+(blacks|whites|asians|hispanics|muslims|jews|christians)\b/gi,
    // Stereotyping
    /\b(typical|stereotypical)\s+(woman|man|girl|boy|asian|black|white|hispanic|muslim|jew)/gi,
  ];

  private static readonly HARMFUL_PATTERNS = [
    // Violence or threats
    /\b(kill|murder|attack|harm|hurt|destroy)\s+(you|yourself|someone|people)/gi,
    // Self-harm
    /\b(commit suicide|hurt yourself|end your life)/gi,
    // Illegal activities
    /\b(how to (hack|steal|cheat|fraud|scam))/gi,
  ];

  private static readonly PERSONAL_INFO_PATTERNS = [
    // Email addresses
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    // Phone numbers (US format)
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    // SSN-like patterns
    /\b\d{3}-\d{2}-\d{4}\b/g,
    // Credit card patterns
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  ];

  /**
   * Moderates text content and returns moderation results
   */
  static moderate(text: string): ModerationResult {
    const flaggedCategories: string[] = [];
    const warnings: string[] = [];
    let severity: 'low' | 'medium' | 'high' | null = null;
    let filteredText = text;

    // Check for profanity
    for (const pattern of this.PROFANITY_PATTERNS) {
      if (pattern.test(text)) {
        flaggedCategories.push('profanity');
        warnings.push('Content contains inappropriate language');
        severity = this.escalateSeverity(severity, 'low');
        // Replace profanity with asterisks
        filteredText = filteredText.replace(pattern, (match) => '*'.repeat(match.length));
        break;
      }
    }

    // Check for bias
    for (const pattern of this.BIAS_PATTERNS) {
      if (pattern.test(text)) {
        flaggedCategories.push('bias');
        warnings.push('Content may contain biased or stereotypical statements');
        severity = this.escalateSeverity(severity, 'medium');
        break;
      }
    }

    // Check for harmful content
    for (const pattern of this.HARMFUL_PATTERNS) {
      if (pattern.test(text)) {
        flaggedCategories.push('harmful');
        warnings.push('Content contains potentially harmful or dangerous information');
        severity = this.escalateSeverity(severity, 'high');
        break;
      }
    }

    // Check for personal information
    for (const pattern of this.PERSONAL_INFO_PATTERNS) {
      if (pattern.test(text)) {
        flaggedCategories.push('personal_info');
        warnings.push('Content may contain personal or sensitive information');
        severity = this.escalateSeverity(severity, 'medium');
        // Redact personal info
        filteredText = filteredText.replace(pattern, '[REDACTED]');
        break;
      }
    }

    // Check text length (spam detection)
    if (text.length > 5000) {
      flaggedCategories.push('spam');
      warnings.push('Content is unusually long');
      severity = this.escalateSeverity(severity, 'low');
    }

    // Check for excessive caps (shouting)
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.5 && text.length > 20) {
      flaggedCategories.push('caps_abuse');
      warnings.push('Excessive use of capital letters detected');
      severity = this.escalateSeverity(severity, 'low');
    }

    return {
      isClean: flaggedCategories.length === 0,
      flaggedCategories: [...new Set(flaggedCategories)],
      severity,
      filteredText: flaggedCategories.length > 0 ? filteredText : undefined,
      warnings,
    };
  }

  /**
   * Escalates severity level
   */
  private static escalateSeverity(
    current: 'low' | 'medium' | 'high' | null,
    newLevel: 'low' | 'medium' | 'high'
  ): 'low' | 'medium' | 'high' {
    const levels = { low: 1, medium: 2, high: 3 };
    const currentLevel = current ? levels[current] : 0;
    const newLevelValue = levels[newLevel];

    if (newLevelValue > currentLevel) {
      return newLevel;
    }
    return current || 'low';
  }
}

/**
 * Visual component to display moderation warnings
 */
export function ModerationWarning({ result }: { result: ModerationResult }) {
  if (result.isClean) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs">
        <CheckCircle className="w-4 h-4" />
        <span>Content verified - No issues detected</span>
      </div>
    );
  }

  const getSeverityColor = () => {
    switch (result.severity) {
      case 'high': return 'bg-red-50 border-red-300 text-red-800';
      case 'medium': return 'bg-yellow-50 border-yellow-300 text-yellow-800';
      case 'low': return 'bg-orange-50 border-orange-300 text-orange-800';
      default: return 'bg-gray-50 border-gray-300 text-gray-800';
    }
  };

  const getSeverityIcon = () => {
    switch (result.severity) {
      case 'high': return <AlertTriangle className="w-5 h-5" />;
      case 'medium': return <Shield className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };

  return (
    <div className={`p-4 border-2 rounded-lg ${getSeverityColor()}`}>
      <div className="flex items-start gap-3">
        {getSeverityIcon()}
        <div className="flex-1">
          <p className="text-sm font-semibold mb-2">
            Content Moderation Alert ({result.severity?.toUpperCase()})
          </p>
          <ul className="text-xs space-y-1 list-disc list-inside">
            {result.warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
          {result.flaggedCategories.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {result.flaggedCategories.map((category) => (
                <span
                  key={category}
                  className="px-2 py-0.5 bg-white/50 rounded-full text-xs font-medium"
                >
                  {category.replace('_', ' ')}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
