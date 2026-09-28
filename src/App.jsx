import React from 'react';
import { AuthModal } from './components/Auth/AuthModal';
import { ThemeProvider } from './context/ThemeContext';
import { ShopProvider } from './context/ShopContext';
import { Navbar } from './components/Header/Navbar';
import { HeroSection } from './components/Hero/HeroSection';
import { CategoryStrip } from './components/Categories/CategoryStrip';
import { FeaturedCollections } from './components/Collections/FeaturedCollections';
import { TrendingSection } from './components/Products/TrendingSection';
import { FlashDeals } from './components/Deals/FlashDeals';
import { InspirationSection } from './components/Articles/InspirationSection';
import { RecommendedSection } from './components/Products/RecommendedSection';
import { CustomerReviews } from './components/Reviews/CustomerReviews';
import { TrustBadges } from './components/Trust/TrustBadges';
import { NewsletterSection } from './components/Newsletter/NewsletterSection';
import { Footer } from './components/Footer/Footer';
import { CartDrawer } from './components/Modals/CartDrawer';
import { WishlistModal } from './components/Modals/WishlistModal';
import { QuickViewModal } from './components/Modals/QuickViewModal';
import { ToastContainer } from './components/Modals/ToastContainer';

export default function App() {
  return (
    <ThemeProvider>
      <ShopProvider>
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300 font-vazir selection:bg-blue-600 selection:text-white">
          {/* Main Floating Glassmorphic Navbar containing Brand, Nav links, Compact Search & Icons */}
          <Navbar />

          {/* Main Body Content: Hero section attached directly under floating navbar without space/gap */}
          <main className="flex-1">
            {/* Full-bleed Hero Section (Pure image backdrop with right-aligned text) */}
            <HeroSection />

            {/* Overlapping Delicate Category Box: Half inside Hero section, half outside */}
            <CategoryStrip />

            {/* Subsequent sections with standard spacing */}
            <div className="space-y-4 sm:space-y-6">
              {/* Featured Collections Grid */}
              <FeaturedCollections />

              {/* Trending Right Now Products */}
              <TrendingSection />

              {/* Flash Deals Section */}
              <FlashDeals />

              {/* Inspiration & Innovation Articles */}
              <InspirationSection />

              {/* Recommended For You Section */}
              <RecommendedSection />

              {/* Customer Testimonials & Reviews */}
              <CustomerReviews />

              {/* Trust & Guarantee Badges */}
              <TrustBadges />

              {/* Newsletter Subscription */}
              <NewsletterSection />
            </div>
          </main>

          {/* Comprehensive Footer */}
          <Footer />

          {/* Interactive Modals & Drawers */}
          <CartDrawer />
          <WishlistModal />
          <QuickViewModal />
          <ToastContainer />
          <AuthModal />
        </div>
      </ShopProvider>
    </ThemeProvider>
  );
}
