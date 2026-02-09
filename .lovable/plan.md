
# Car Encyclopedia Web App

## Design Style
Dark theme throughout, inspired by the reference images — bold typography, clean card-based layouts, high-contrast text on dark backgrounds. Desktop-first but responsive.

## Pages & Features

### 1. Homepage — Car News Feed
- Dark hero section with a prominent search bar at the top
- "Breaking News" section with a featured large card and category tags (e.g., Electric, Racing, Luxury)
- "Recommended" section below with a list of news article cards (thumbnail, title, source, date)
- News will be fetched live using **Perplexity** web search for real-time automotive news
- Bottom navigation or sidebar with links to News, Search, and AI Chat

### 2. Car Search & Results
- Search bar with autocomplete suggestions
- Year/model selector (dropdown or filter chips)
- Results displayed as cards with car images, name, and year range
- Search powered by **Lovable AI** — users type a car name and the AI returns matching car info

### 3. Car Detail Page
- Large hero image of the car (AI-sourced or placeholder)
- Bold year range and car name (like the Corvette timeline reference)
- Sections: **History & Heritage**, **Specs** (horsepower, mileage, price, engine, transmission), **Class/Category**
- Clean stat cards with key numbers
- All car data generated on-demand by **Lovable AI** when a car is selected

### 4. AI Car Advisor (Chat)
- Floating chat button or dedicated tab
- Conversational AI chatbot powered by **Lovable AI** with streaming responses
- Users can ask questions like "What's the best SUV under $40k?" or "Compare the BMW M3 vs Audi RS5"
- Chat history maintained during the session
- Markdown-rendered responses for rich formatting

## Backend Requirements
- **Lovable Cloud** for edge functions and secrets management
- **Perplexity connector** for live car news search
- **Lovable AI** for car data generation and the AI chat advisor
- No database needed initially — all data is AI-generated on demand
