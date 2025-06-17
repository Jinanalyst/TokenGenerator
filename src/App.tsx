
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import LiquidityPool from "./pages/LiquidityPool";
import MarketMaker from "./pages/MarketMaker";
import AirdropSiteMaker from "./pages/AirdropSiteMaker";
import ClaimSite from "./pages/ClaimSite";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/app" element={<Index />} />
            <Route path="/liquidity-pool" element={<LiquidityPool />} />
            <Route path="/market-maker" element={<MarketMaker />} />
            <Route path="/airdrop-site-maker" element={<AirdropSiteMaker />} />
            <Route path="/claim/:claimId" element={<ClaimSite />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
