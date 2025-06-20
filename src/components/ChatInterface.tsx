import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import TokenCreationPanel from './TokenCreationPanel';
import WalletSelector from './WalletSelector';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  tokenData?: any;
}

// Helper functions for local AI mock
const extractTokenName = (text: string): string | null => {
  // Case: "create a [name] token"
  let nameMatch = text.match(/create\s(?:a|an|the)?\s*(.+?)\s+token/i);
  if (nameMatch && nameMatch[1]) return nameMatch[1].trim();

  // Case: "token called [name]"
  nameMatch = text.match(/token\s+called\s+['"]?([^'"]+?)['"]?(?:\s+\(|$|\s+and)/i);
  if (nameMatch && nameMatch[1]) return nameMatch[1].trim();

  return null;
};

const extractTokenSymbol = (text: string): string | null => {
  // Case: (SYMBOL)
  let symbolMatch = text.match(/\((.+?)\)/i);
  if (symbolMatch && symbolMatch[1]) return symbolMatch[1].toUpperCase().trim();

  // Case: "... called SYMBOL" where SYMBOL is all caps
  symbolMatch = text.match(/called\s+([A-Z]{2,10})\b/);
  if (symbolMatch && symbolMatch[1]) return symbolMatch[1].toUpperCase();

  return null;
};

const extractTokenSupply = (text: string): number | null => {
  const millionMatch = text.match(/(\d+(?:\.\d+)?)\s*million/i);
  if (millionMatch) return Math.floor(parseFloat(millionMatch[1]) * 1000000);
  
  const billionMatch = text.match(/(\d+(?:\.\d+)?)\s*billion/i);
  if (billionMatch) return Math.floor(parseFloat(billionMatch[1]) * 1000000000);
  
  const supplyMatch = text.match(/(\d[\d,]*)\s*(?:tokens?|supply)/i);
  return supplyMatch ? parseInt(supplyMatch[1].replace(/,/g, '')) : null;
};

const extractNetwork = (text: string): 'mainnet' | 'devnet' | null => {
  const input = text.toLowerCase();
  if (input.includes('mainnet')) return 'mainnet';
  if (input.includes('devnet')) return 'devnet';
  return null;
};

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hey there! 👋 I'm your Solana Token Generator AI assistant. Just describe the token you want to create, and I'll configure it for you.",
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentTokenData, setCurrentTokenData] = useState({
    name: 'Your Token',
    symbol: 'TOKEN',
    supply: 1000000,
    decimals: 9,
    network: 'devnet',
    revokeMintAuthority: false,
    revokeFreezeAuthority: false,
    revokeUpdateAuthority: false,
    image: ''
  });
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [shouldShowPanel, setShouldShowPanel] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTokenDataChange = (newTokenData: any) => {
    setCurrentTokenData(newTokenData);
  };

  const getAIResponse = async (userInput: string) => {
    setIsTyping(true);

    // For local development, mock the AI response to avoid needing a deployed function.
    if (import.meta.env.DEV) {
      const extractedSymbol = extractTokenSymbol(userInput);
      const extractedName = extractTokenName(userInput) || (extractedSymbol ? currentTokenData.name : null);
      const extractedSupply = extractTokenSupply(userInput);
      const extractedNetwork = extractNetwork(userInput);

      const updatedTokenData = {
        ...currentTokenData,
        name: extractedName || currentTokenData.name,
        symbol: extractedSymbol || currentTokenData.symbol,
        supply: extractedSupply || currentTokenData.supply,
        network: extractedNetwork || currentTokenData.network,
      };

      let content = `I've updated the token details based on your request:\n\n` +
                    `**Name**: ${updatedTokenData.name}\n` +
                    `**Symbol**: ${updatedTokenData.symbol}\n` +
                    `**Supply**: ${updatedTokenData.supply.toLocaleString()}\n` +
                    `**Network**: ${updatedTokenData.network.toUpperCase()}`;
      
      if (!extractedName && !extractedSymbol && !extractedSupply && !extractedNetwork) {
          content = "I didn't quite catch that. You can ask me to set the token name, symbol, supply, or network. For example: 'Create a token named MyCoin (MC) with 100 million supply on mainnet'."
      }

      // Simulate network delay
      await new Promise(res => setTimeout(res, 500));

      const isTokenRelated = ['token', 'create', 'supply', 'symbol', 'name', 'mint', 'authority', 'mainnet', 'devnet', 'launch', 'deploy'].some(keyword => userInput.toLowerCase().includes(keyword));

      setIsTyping(false);
      return { content, tokenData: updatedTokenData, showPanel: isTokenRelated };
    }

    try {
      // In a real application, this would call a secure backend endpoint
      // that then calls the AI model with proper API keys.
      // We are calling a Supabase Edge Function here.
      const { data, error } = await supabase.functions.invoke('parse-token-prompt', {
        body: { prompt: userInput, currentTokenData },
      });

      if (error) {
        throw error;
      }
      
      return data;

    } catch (error) {
      console.error("Error fetching AI response:", error);
      toast({
        title: "AI Error",
        description: "Could not get a response from the AI agent. Please try again.",
        variant: "destructive"
      });
      return {
        content: "I'm having trouble connecting to my brain right now. Please try again in a moment.",
        tokenData: currentTokenData,
      };
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    
    const aiResponse = await getAIResponse(currentInput);

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: aiResponse.content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, aiMessage]);
    
    if (aiResponse.tokenData) {
      setCurrentTokenData(aiResponse.tokenData);
    }
    if (aiResponse.showPanel) {
      setShouldShowPanel(true);
    }
  };

  return (
    <div className="container mx-auto px-4 max-w-4xl">
      <div className="mb-4">
        <WalletSelector />
      </div>

      <Card className="bg-black/20 backdrop-blur-lg border-purple-500/30 shadow-2xl">
        <div className="h-96 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.type === 'ai' ? 'bg-gradient-to-r from-purple-400 to-blue-400' : 'bg-gray-700'}`}>
                {msg.type === 'ai' ? <Bot className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
              </div>
              <div className={`p-3 rounded-lg max-w-sm ${
                msg.type === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white/10 text-purple-100'
              }`}>
                <p className="text-sm" style={{whiteSpace: 'pre-wrap'}}>{msg.content}</p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white/10 text-white border border-white/20 px-4 py-3 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="border-t border-purple-500/30 p-4">
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="e.g., 'Create a token named...'"
              className="bg-white/10 border-white/20 text-white flex-1"
              disabled={isTyping}
            />
            <Button type="submit" disabled={isTyping || !inputValue.trim()} className="bg-purple-500 hover:bg-purple-600">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>

      {shouldShowPanel && (
        <div className="mt-6">
          <TokenCreationPanel 
            tokenData={currentTokenData} 
            onTokenDataChange={handleTokenDataChange}
          />
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
