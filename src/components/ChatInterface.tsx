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
  const input = text.toLowerCase().replace(/\s+/g, '');
  if (input.includes('mainnet') || input.includes('mainnetwork')) return 'mainnet';
  if (input.includes('devnet') || input.includes('devnetwork') || input.includes('dev-net')) return 'devnet';
  return null;
};

const ChatInterface = () => {
  const [showTokenPanel, setShowTokenPanel] = useState(false);
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

    console.log("AI Response:", aiResponse);

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

    // Show the panel if the AI response is not the default fallback message
    if (
      aiResponse.content &&
      !aiResponse.content.includes("I didn't quite catch that")
    ) {
      setShouldShowPanel(true);
    }
  };

  return (
    <div className="container mx-auto px-4 max-w-4xl">
      {/* Chat interface always at the top */}
      <div className="mb-4 mt-8">
        <WalletSelector />
      </div>

      <div className="mb-4">
        <Card className="bg-black/20 backdrop-blur-lg border-purple-500/30 p-6 min-h-[400px]">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    msg.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-purple-700/80 text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    {msg.type === 'ai' ? (
                      <Bot className="w-4 h-4 text-purple-200" />
                    ) : (
                      <User className="w-4 h-4 text-blue-200" />
                    )}
                    <span className="text-xs text-gray-300">
                      {msg.type === 'ai' ? 'AI' : 'You'}
                    </span>
                  </div>
                  <div className="whitespace-pre-line">{msg.content}</div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-lg px-4 py-2 bg-purple-700/80 text-white max-w-[80%] flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 animate-pulse text-purple-200" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </Card>
      </div>

      <form
        className="flex items-center space-x-2 mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
      >
        <Input
          className="flex-1 bg-black/30 border-purple-500/30 text-white"
          placeholder="e.g., Create a token named Phantom (PHM) with 300 million supply on devnet"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isTyping}
        />
        <Button
          type="submit"
          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
          disabled={isTyping || !inputValue.trim()}
        >
          <Send className="w-4 h-4 mr-1" />
          Send
        </Button>
      </form>

      {/* Token Creation Panel appears below the chat after valid prompt */}
      {shouldShowPanel && (
        <div className="mt-8">
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
