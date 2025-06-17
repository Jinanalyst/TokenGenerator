import React from 'react';
import ChatInterface from '../components/ChatInterface';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SEO from '@/components/SEO';

const Index = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Solana Token Generator AI",
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Web Browser",
    "description": "AI-powered Solana SPL token creation tool with chat interface",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "AI-powered token creation",
      "Solana SPL token deployment", 
      "Mainnet and Devnet support",
      "Authority management",
      "Real-time chat interface"
    ]
  };

  return (
    <>
      <SEO
        title="AI Token Generator - Create Solana SPL Tokens with Chat Interface"
        description="Use our AI chat interface to create custom Solana SPL tokens instantly. Deploy to mainnet or devnet with advanced authority controls. No coding required."
        keywords="solana token creator, AI token generator, SPL token deployment, solana chat bot, cryptocurrency creation, blockchain tools"
        canonical="https://solana-token-bot-genie.lovable.app/app"
        ogTitle="Create Solana Tokens with AI - Interactive Token Generator"
        ogDescription="Chat with our AI to create custom Solana SPL tokens. Deploy instantly to mainnet or devnet with full authority controls."
        structuredData={structuredData}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-blue-500/10"></div>
        </div>
        
        {/* Header */}
        <header className="relative z-10 pt-8 pb-4">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-4">
              <Link to="/">
                <Button variant="outline" size="sm" className="border-purple-300 text-purple-300 hover:bg-purple-300 hover:text-purple-900 backdrop-blur-sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">AI</span>
                </div>
                <h1 className="text-4xl font-bold text-white">
                  Solana Token Generator AI
                </h1>
              </div>
              <h2 className="text-purple-200 text-lg max-w-2xl mx-auto">
                Chat with our AI agent to create custom Solana SPL tokens effortlessly. 
                Just describe what you want, and watch the magic happen!
              </h2>
            </div>
          </div>
        </header>

        {/* Chat Interface */}
        <main className="relative z-10 flex-1">
          <ChatInterface />
        </main>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-purple-500 rounded-full opacity-10 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-blue-500 rounded-full opacity-10 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-20 w-16 h-16 bg-indigo-500 rounded-full opacity-10 animate-pulse delay-500"></div>
      </div>
    </>
  );
};

export default Index;
