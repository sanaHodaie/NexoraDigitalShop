import React from 'react';
import { HeroSection } from '../components/Hero/HeroSection';
import { CategoryStrip } from '../components/Categories/CategoryStrip';
import { FeaturedCollections } from '../components/Collections/FeaturedCollections';
import { TrendingSection } from '../components/Products/TrendingSection';
import { FlashDeals } from '../components/Deals/FlashDeals';
import { InspirationSection } from '../components/Articles/InspirationSection';
import { RecommendedSection } from '../components/Products/RecommendedSection';
import { CustomerReviews } from '../components/Reviews/CustomerReviews';
import { TrustBadges } from '../components/Trust/TrustBadges';
import { NewsletterSection } from '../components/Newsletter/NewsletterSection';

export default function HomePage() { return <>

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
          
</>; }
