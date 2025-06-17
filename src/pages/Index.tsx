
import React from 'react';
import ChatInterface from '../components/ChatInterface';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background Effects */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      ></div>
      
      {/* Header */}
      <div className="relative z-10 pt-8 pb-4">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center">
              <span className="text-white font-bold text-xl">AI</span>
            </div>
            <h1 className="text-4xl font-bold text-white">
              Solana Token Generator AI
            </h1>
          </div>
          <p className="text-purple-200 text-lg max-w-2xl mx-auto">
            Chat with our AI agent to create custom Solana tokens effortlessly. 
            Just describe what you want, and watch the magic happen!
          </p>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="relative z-10 flex-1">
        <ChatInterface />
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-purple-500 rounded-full opacity-10 animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-blue-500 rounded-full opacity-10 animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 right-20 w-16 h-16 bg-indigo-500 rounded-full opacity-10 animate-pulse delay-500"></div>
    </div>
  );
};

export default Index;
