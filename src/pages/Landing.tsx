import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Code, Shield, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';

const Landing = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Solana Token Generator AI",
    "url": "https://solana-token-bot-genie.lovable.app",
    "logo": "https://lovable.dev/opengraph-image-p98pqg.png",
    "description": "The most advanced AI-powered token generator for Solana blockchain. Create custom SPL tokens in seconds with no coding required.",
    "sameAs": [
      "https://solana.com",
      "https://twitter.com/solana"
    ],
    "offers": {
      "@type": "Offer",
      "name": "Solana Token Creation Service",
      "description": "Create custom Solana SPL tokens with AI assistance",
      "price": "Free",
      "priceCurrency": "USD"
    },
    "service": [
      {
        "@type": "Service",
        "name": "Token Creation",
        "description": "AI-powered Solana token generation"
      },
      {
        "@type": "Service", 
        "name": "Market Making",
        "description": "Automated market making bots for token liquidity"
      },
      {
        "@type": "Service",
        "name": "Airdrop Campaigns",
        "description": "Create and manage token airdrop campaigns"
      }
    ]
  };

  return (
    <>
      <SEO
        title="Solana Token Generator AI - Create SPL Tokens in Seconds | No Code Required"
        description="Create custom Solana SPL tokens instantly with our AI-powered generator. No coding skills needed. Deploy to mainnet or devnet with advanced features like market making and airdrops."
        keywords="solana token generator, SPL token creator, solana blockchain, cryptocurrency token, DeFi tools, token deployment, mainnet tokens, devnet testing"
        canonical="https://solana-token-bot-genie.lovable.app"
        ogTitle="Solana Token Generator AI - Create SPL Tokens in Seconds"
        ogDescription="The most advanced AI-powered token generator for Solana. Create custom tokens instantly with no coding required."
        structuredData={structuredData}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-blue-500/10"></div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-purple-500 rounded-full opacity-10 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-blue-500 rounded-full opacity-10 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-20 w-16 h-16 bg-indigo-500 rounded-full opacity-10 animate-pulse delay-500"></div>
        <div className="absolute bottom-40 left-20 w-24 h-24 bg-cyan-500 rounded-full opacity-10 animate-pulse delay-700"></div>

        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header */}
          <header className="pt-8 pb-4">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">AI</span>
                </div>
                <h1 className="text-2xl font-bold text-white">
                  Solana Token Generator
                </h1>
              </div>
            </div>
          </header>

          {/* Hero Section */}
          <main className="flex-1 flex items-center justify-center">
            <div className="container mx-auto px-4 text-center">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
                  Create Solana Tokens
                  <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent block">
                    in Seconds
                  </span>
                </h1>
                
                <h2 className="text-xl md:text-2xl text-purple-200 mb-8 max-w-2xl mx-auto leading-relaxed">
                  The most advanced AI-powered token generator for Solana. 
                  No coding required - just chat with our AI and watch your token come to life.
                </h2>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                  <Link to="/app">
                    <Button size="lg" className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2">
                      Launch Token Generator
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </Link>
                  <Link to="/app">
                    <Button variant="outline" size="lg" className="border-purple-300 text-purple-300 hover:bg-purple-300 hover:text-purple-900 px-8 py-4 text-lg font-semibold rounded-full backdrop-blur-sm">
                      Learn More
                    </Button>
                  </Link>
                </div>

                {/* Feature Cards */}
                <section className="grid md:grid-cols-3 gap-6 mb-12">
                  <Card className="bg-white/10 backdrop-blur-sm border-purple-300/20 hover:bg-white/15 transition-all duration-300">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Lightning Fast Token Creation</h3>
                      <p className="text-purple-200">Create and deploy SPL tokens in under 60 seconds with our AI-powered workflow on Solana blockchain.</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/10 backdrop-blur-sm border-purple-300/20 hover:bg-white/15 transition-all duration-300">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Code className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">No Code Required</h3>
                      <p className="text-purple-200">Simply chat with our AI agent and describe your Solana token vision. Perfect for beginners and experts.</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/10 backdrop-blur-sm border-purple-300/20 hover:bg-white/15 transition-all duration-300">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Secure & Reliable</h3>
                      <p className="text-purple-200">Built with enterprise-grade security and Solana blockchain best practices for maximum trust.</p>
                    </CardContent>
                  </Card>
                </section>

                {/* FAQ Section for SEO */}
                <section className="mb-12">
                  <h2 className="text-3xl font-bold text-white mb-8">Frequently Asked Questions</h2>
                  <div className="grid md:grid-cols-2 gap-6 text-left">
                    <div className="bg-white/5 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-white mb-3">What is a Solana SPL token?</h3>
                      <p className="text-purple-200">SPL tokens are the standard for tokens on the Solana blockchain, similar to ERC-20 tokens on Ethereum but with faster speeds and lower costs.</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-white mb-3">How much does it cost to create a token?</h3>
                      <p className="text-purple-200">Token creation costs vary by network. Devnet is free for testing, while mainnet requires a small amount of SOL for blockchain fees.</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-white mb-3">Can I create tokens without coding?</h3>
                      <p className="text-purple-200">Yes! Our AI assistant handles all the technical aspects. Just describe your token in plain English and we'll handle the rest.</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-white mb-3">What additional features are available?</h3>
                      <p className="text-purple-200">We offer market making bots, airdrop campaigns, liquidity pool creation, and authority management for comprehensive token deployment.</p>
                    </div>
                  </div>
                </section>

                {/* Stats Section */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                  <div>
                    <div className="text-3xl md:text-4xl font-bold text-white mb-1">10K+</div>
                    <div className="text-purple-300">Tokens Created</div>
                  </div>
                  <div>
                    <div className="text-3xl md:text-4xl font-bold text-white mb-1">98%</div>
                    <div className="text-purple-300">Success Rate</div>
                  </div>
                  <div>
                    <div className="text-3xl md:text-4xl font-bold text-white mb-1">30s</div>
                    <div className="text-purple-300">Average Time</div>
                  </div>
                  <div>
                    <div className="text-3xl md:text-4xl font-bold text-white mb-1">24/7</div>
                    <div className="text-purple-300">AI Support</div>
                  </div>
                </section>
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="pb-8">
            <div className="container mx-auto px-4 text-center">
              <p className="text-purple-300">
                © 2024 Solana Token Generator AI. Built for the future of DeFi on Solana blockchain.
              </p>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
};

export default Landing;
