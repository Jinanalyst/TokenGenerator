import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import AIAgent from './AIAgent';
import TokenCreationPanel from './TokenCreationPanel';
import WalletConnection from './WalletConnection';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  tokenData?: any;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hey there! 👋 I'm your Solana Token Generator AI assistant. I can help you create real tokens on both Solana mainnet and devnet with advanced features like authority controls. Connect your wallet and let's create something amazing!",
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentTokenData, setCurrentTokenData] = useState(null);
  const [wallet, setWallet] = useState(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI processing
    setTimeout(() => {
      const aiResponse = generateAIResponse(inputValue);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse.content,
        timestamp: new Date(),
        tokenData: aiResponse.tokenData,
      };

      setMessages(prev => [...prev, aiMessage]);
      if (aiResponse.tokenData) {
        setCurrentTokenData(aiResponse.tokenData);
      }
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (userInput: string) => {
    const input = userInput.toLowerCase();

    if (input.includes('wallet') && !wallet) {
      return {
        content: "I see you're asking about wallet connection! Please use the wallet connection panel above to connect your Phantom wallet. Once connected, you'll be able to create real Solana tokens with all the advanced features.",
        tokenData: null
      };
    }

    if (input.includes('authority') || input.includes('revoke') || input.includes('mint') || input.includes('freeze')) {
      return {
        content: "Great question about token authorities! 🔐\n\n**Authority Types:**\n• **Mint Authority**: Can create new tokens\n• **Freeze Authority**: Can freeze token accounts\n• **Update Authority**: Can modify token metadata\n\n**Revoking Authorities:**\n• Increases trust and security\n• Makes tokens more decentralized\n• Cannot be undone once revoked\n\nWhen creating your token, you can choose which authorities to revoke. This is especially important for meme coins and community tokens!",
        tokenData: null
      };
    }

    if (input.includes('liquidity') || input.includes('pool') || input.includes('raydium')) {
      return {
        content: "Awesome! Adding liquidity is crucial for token trading. 💧\n\nAfter creating your token, you can:\n• Create a liquidity pool on Raydium\n• Set the initial price ratio\n• Earn fees from trades\n• Provide better trading experience\n\nI'll show you the liquidity pool creation page once your token is ready!",
        tokenData: null
      };
    }

    if (input.includes('create') || input.includes('token') || input.includes('generate')) {
      return {
        content: "Awesome! I'm detecting you want to create a real token. Let me gather some details. What should we call your token? What's the symbol (like BTC, ETH)? Also, would you prefer mainnet or devnet? And do you want to revoke any authorities for security?",
        tokenData: null
      };
    }

    if (input.includes('mainnet') || input.includes('devnet')) {
      const network = input.includes('mainnet') ? 'mainnet' : 'devnet';
      return {
        content: `Perfect! I'll set this up for Solana ${network}. Now, could you tell me more about your token? What's the name, symbol, and how many tokens should we create initially?`,
        tokenData: { network }
      };
    }

    // Check if user is providing token details
    if (input.includes('name') || input.includes('symbol') || /\b[A-Z]{2,5}\b/.test(userInput)) {
      const tokenData = {
        name: extractTokenName(userInput),
        symbol: extractTokenSymbol(userInput),
        supply: extractTokenSupply(userInput) || 1000000,
        decimals: 9,
        network: 'devnet'
      };

      return {
        content: `Great! I've got the details for your token:\n\n🪙 **Name**: ${tokenData.name || 'Your Token'}\n🏷️ **Symbol**: ${tokenData.symbol || 'TOKEN'}\n📊 **Supply**: ${tokenData.supply.toLocaleString()}\n🌐 **Network**: ${tokenData.network}\n\nLooks good? I can create this token for you right now! Just say "create it" or "let's go"!`,
        tokenData
      };
    }

    if (input.includes('create it') || input.includes("let's go") || input.includes('deploy')) {
      return {
        content: "🚀 Initiating token creation on Solana! This is where the magic happens...\n\n✨ Connecting to Solana network\n🔐 Setting up token mint\n📝 Configuring metadata\n🎯 Deploying smart contract\n\n*Note: This is a demo interface. In production, this would connect to actual Solana APIs and create real tokens!*",
        tokenData: currentTokenData
      };
    }

    // Default responses
    const responses = [
      "I'm here to help you create real Solana tokens with advanced features! Tell me about your token vision.",
      "Ready to build something amazing on Solana? I can help with token creation, authorities, and liquidity pools!",
      "Let's create your token with proper authority controls and get it listed on Raydium! What's your idea?",
      "I can create production-ready tokens with mint/freeze authority controls. What token should we build?"
    ];

    return {
      content: responses[Math.floor(Math.random() * responses.length)],
      tokenData: null
    };
  };

  const extractTokenName = (text: string) => {
    const nameMatch = text.match(/name[:\s]+([A-Za-z\s]+)/i);
    return nameMatch ? nameMatch[1].trim() : null;
  };

  const extractTokenSymbol = (text: string) => {
    const symbolMatch = text.match(/symbol[:\s]+([A-Z]{2,5})/i) || text.match(/\b([A-Z]{2,5})\b/);
    return symbolMatch ? symbolMatch[1] : null;
  };

  const extractTokenSupply = (text: string) => {
    const supplyMatch = text.match(/(\d+(?:,\d+)*)\s*(?:tokens?|supply)/i);
    return supplyMatch ? parseInt(supplyMatch[1].replace(/,/g, '')) : null;
  };

  return (
    <div className="container mx-auto px-4 max-w-4xl">
      {/* Wallet Connection */}
      <div className="mb-4">
        <WalletConnection onWalletChange={setWallet} />
      </div>

      <Card className="bg-black/20 backdrop-blur-lg border-purple-500/30 shadow-2xl">
        {/* Chat Messages */}
        <div 
          ref={chatContainerRef}
          className="h-96 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-3 max-w-xs lg:max-w-md`}>
                {message.type === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                
                <div
                  className={`px-4 py-3 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white ml-auto'
                      : 'bg-white/10 text-white border border-white/20'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>
                  {message.tokenData && (
                    <div className="mt-3 p-3 bg-black/20 rounded-lg border border-purple-500/30">
                      <div className="text-xs text-purple-200 mb-2">Token Preview:</div>
                      <div className="space-y-1 text-sm">
                        <div>Name: {message.tokenData.name || 'N/A'}</div>
                        <div>Symbol: {message.tokenData.symbol || 'N/A'}</div>
                        <div>Supply: {message.tokenData.supply?.toLocaleString() || 'N/A'}</div>
                        <div>Network: {message.tokenData.network || 'devnet'}</div>
                      </div>
                    </div>
                  )}
                </div>

                {message.type === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-blue-400 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
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

        {/* Input Area */}
        <div className="border-t border-purple-500/30 p-4">
          <div className="flex space-x-3">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask about token creation, authorities, liquidity pools... (e.g., 'Create a token with revoked mint authority')"
              className="flex-1 bg-white/10 border-white/20 text-white placeholder-white/60 focus:border-purple-400"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-6"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Token Creation Panel */}
      {currentTokenData && (
        <div className="mt-6">
          <TokenCreationPanel tokenData={currentTokenData} wallet={wallet} />
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
