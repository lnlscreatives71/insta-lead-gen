# 🟣 Shared Success Lead Engine: User Guide

Welcome to the **Shared Success Lead Engine**. This professional tool helps you find "hidden gem" influencers on Instagram—creators with high engagement who haven't started selling products yet—so you can partner with them.

---

## 🛠️ Phase 1: Preparation (The Keys)

To run the engine, you need two "keys" that act like fuel for the software.

1.  **The Intelligence Key (Gemini API)**: 
    *   **Required.** This is free (within limits).
    *   Go to [Google AI Studio](https://aistudio.google.com/).
    *   Click "Get API Key" and copy the long string of letters and numbers.
2.  **The Instagram Key (Apify API)**:
    *   **Optional.** Highly recommended for real-time, highly accurate data.
    *   Go to [Apify.com](https://apify.com/) and create a free account.
    *   Navigate to **Settings > Integrations** in your Apify console.
    *   Copy your "Personal API token". (Apify provides generous free monthly credits for this).

---

## 💻 Phase 2: Local Installation

Follow these three simple steps to get the app onto your computer:

### 1. Download the Files
Place all the project files (`App.tsx`, `index.html`, etc.) into a folder on your computer named `LeadEngine`.

### 2. Install the "Runner"
The app needs a small program called **Node.js** to run. 
*   Download and install it from [nodejs.org](https://nodejs.org/).
*   Once installed, open your computer's **Terminal** (or Command Prompt).
*   Type `cd LeadEngine` and press Enter.
*   Type `npm install vite` and press Enter.

### 3. Add Your Intelligence Key
You must tell the app your Google Gemini key:
*   In your `LeadEngine` folder, create a new text file and name it `.env`.
*   Inside that file, paste this line (replace the symbols with your actual key):
    `API_KEY=your_google_key_here`

---

## 🚀 Phase 3: Launching the Engine

1.  Open your **Terminal**.
2.  Type `npx vite` and press Enter.
3.  The terminal will give you a link (usually `http://localhost:5173`). 
4.  **Hold Command (or Ctrl) and click that link** to open the Lead Engine in your browser.

---

## 📖 Phase 4: How to Use the App & Expected Outputs

### Step 1: Initialize Your Workspace
*   **Workspace ID**: Enter your name or agency name. The app creates a local, encrypted database linked to this name. If you close the app and return later, typing this exact ID will restore all your previously saved leads.
*   **Apify API Token**: Paste your Apify token here to run the "Hybrid Engine" for deep, real-time scraping. If you leave it blank, the app will gracefully fall back to "Lite Mode" (using only the Gemini AI for discovery).

### Step 2: Run a Discovery Extraction
*   **Target Niche**: Enter a highly specific niche (e.g., "Vegan Meal Prep", "Home Gym Setup") or select one from the Trending dropdown.
*   **Audit Batch Size**: Choose how many profiles to scan at once (5 to 25). 
*   *What happens behind the scenes?* The engine scans Instagram for creators in your niche using the Apify Search Actor, then runs a deep audit on their profiles. It specifically filters out anyone over 100k followers, and runs a "Red Flag" check on their bio to ensure they aren't already selling courses, templates, or coaching.

---

## 📊 Phase 5: Understanding Your Insights & Outputs

Once the extraction is complete, the engine delivers a highly curated **Lead Table**. Here is exactly what insights you gain from the output:

### 1. The Master Lead Table
For every qualified creator, you will immediately see:
*   **Creator Profile**: Their Handle, Follower Count, and Profile Picture.
*   **Strategy**: The AI analyzes their specific bio and niche to recommend the exact type of digital product they should be selling (e.g., "High-Protein Recipe Ebook" or "SEO Mini-Course").
*   **Rev. Opportunity (Revenue Gap)**: The app calculates a customized financial projection. It estimates how much money they are currently losing out on by *not* having a product, based on their audience size and standard conversion rates.

### 2. Strategy Deep Dive (The Eye Icon)
Clicking the **Eye Icon** opens a detailed insight dashboard for that specific creator. Here, you gain deep context to leverage in your sales pitch:
*   **Content Format Bias**: You'll see if they perform better on *Reels* or *Carousels*, allowing you to pitch a product that fits their specific media style.
*   **Posting Velocity**: Insights into how often they post, proving they have an active, engaged audience.
*   **Qualifier Summary**: Hard proof that there is a "Commercial Void" (they have attention, but no monetization vehicle), making them the perfect candidate for a Shared Success partnership.
*   **Proven Competitors**: The AI finds 2-3 similar creators in their niche who *are* successfully monetizing, giving you powerful leverage for your pitch.

### 3. AI-Generated Pitch (The Message Icon)
Instead of writing cold emails from scratch, click the **Message Icon**.
*   **The Output**: The engine feeds all the scraped data (their niche, bio, format bias, and revenue gap) into Google Gemini to write a highly personalized, non-spammy outreach message.
*   **The Insight**: The generated message focuses on the data. It compliments their specific content style, points out the calculated revenue gap, and pitches the exact product idea the engine generated. You can copy this to your clipboard in one click.

### 4. The Lead Archive & CSV Export
*   **The Output**: Every qualified lead is permanently saved to your Workspace ID's history. 
*   Click **Download Archive** to export a clean, organized CSV file containing all scraped data, emails, and suggested product strategies. You can import this directly into your CRM (like GoHighLevel, Hubspot, or Notion) to manage your outreach pipeline.

---

## ❓ Common Questions

**"It says 'Searching' but nothing is happening."**
Check your Terminal for errors. This usually means your `.env` file is missing or your API Key is incorrect.

**"Can I use this on different devices?"**
Yes! Just follow the setup on any computer. However, since the "Discovery Archive" is stored securely on the local device, your history will stay on the specific computer you used to run the search.

**"Why did I search for 10 leads, but only got 3 back?"**
The engine is ruthless with its filtering. If you ask for 10 leads, it scans 10+ people. If most of them already have a Linktree selling a product, or have over 100k followers, it automatically rejects them to protect your time. You only see the highly qualified prospects!