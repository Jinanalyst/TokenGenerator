
import React from 'react';
import { Bot, Sparkles } from 'lucide-react';

interface AIAgentProps {
  isThinking?: boolean;
}

const AIAgent: React.FC<AIAgentProps> = ({ isThinking = false }) => {
  return (
    <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-500/30">
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center">
          <Bot className="w-6 h-6 text-white" />
        </div>
        {isThinking && (
          <div className="absolute -top-1 -right-1">
            <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-white font-semibold">Solana AI Agent</h3>
        <p className="text-purple-200 text-sm">
          {isThinking ? 'Thinking...' : 'Ready to create tokens'}
        </p>
      </div>
      
      <div className="flex-1 flex justify-end">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-100"></div>
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-200"></div>
        </div>
      </div>
    </div>
  );
};

export default AIAgent;
