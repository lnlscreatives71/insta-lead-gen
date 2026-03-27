# ☁️ Cloud Hosting Guide: Shared Success Lead Engine

Hosting this app on the cloud means you can access it from any computer or share it with your team via a custom URL, without needing to run terminal commands every time.

Follow **Phase 1** to get your code ready, and then pick **one** of the three hosting options in **Phase 2**.

---

## 📦 Phase 1: Upload Your Code to GitHub (Required for all options)

All modern hosting platforms pull your code directly from GitHub. This makes updating your app as easy as uploading a new file.

1.  **Create an Account**: Go to [GitHub.com](https://github.com/) and create a free account.
2.  **Create a Repository**:
    *   Click the **"+"** icon in the top right corner and select **New repository**.
    *   Name it something like `lead-engine`.
    *   Keep it **Private** (so others can't see your code).
    *   Click **Create repository**.
3.  **Upload Your Files**:
    *   On the next screen, look for the link that says **"uploading an existing file"** and click it.
    *   Drag and drop ALL your project files (`App.tsx`, `index.html`, `package.json`, `services` folder, etc.) into the box.
    *   *Important: DO NOT upload the `.env` file or `node_modules` folder.*
    *   Click the green **Commit changes** button at the bottom.

---

## 🚀 Phase 2: Choose Your Hosting Provider

Choose **one** of the following free platforms. Vercel is highly recommended as it requires the least amount of configuration for Vite/React apps.

### Option 1: Vercel (⭐️ Recommended - Easiest Setup)
Vercel is built specifically for modern frontend frameworks and will almost instantly recognize how to build your app.

1.  Go to [Vercel.com](https://vercel.com/) and sign up using your **GitHub account**.
2.  Once logged in, click **Add New...** and select **Project**.
3.  You will see a list of your GitHub repositories. Find `lead-engine` and click **Import**.
4.  **Configure the Build**:
    *   Vercel will auto-detect that you are using Vite. Leave the Build Command and Output Directory as their defaults.
5.  **Add Your Environment Variables** (Crucial Step):
    *   Click on the **Environment Variables** dropdown menu.
    *   In the **Name** box, type: `API_KEY`
    *   In the **Value** box, paste your actual Google Gemini API Key.
    *   Click **Add**.
    *   *(Note: You do NOT need to add your Apify token here. Users will enter that securely on the app's login screen).*
6.  Click the big **Deploy** button. 
7.  Wait about 60 seconds. Vercel will give you a live URL (e.g., `lead-engine.vercel.app`) that you can click to view your live app!

---

### Option 2: Netlify (Great for Beginners)
Netlify is incredibly user-friendly and offers a very generous free tier.

1.  Go to [Netlify.com](https://www.netlify.com/) and sign up using your **GitHub account**.
2.  On your team dashboard, click **Add new site** and select **Import an existing project**.
3.  Click the **GitHub** button to authorize Netlify to see your code.
4.  Select your `lead-engine` repository from the list.
5.  **Configure the Build**:
    *   **Build command**: Type `npm run build`
    *   **Publish directory**: Type `dist`
6.  **Add Your Environment Variables**:
    *   Click **Show advanced**.
    *   Click **New variable**.
    *   **Key**: `API_KEY`
    *   **Value**: Paste your Google Gemini API Key.
    *   *(Note: Apify token is not required here).*
7.  Click **Deploy site**.
8.  Netlify will build your site. Once it says "Published", you can click the generated URL to use your app. You can also rename the URL in the "Site Settings" to something cleaner.

---

### Option 3: Render (Solid Alternative)
Render is a great platform that offers static site hosting completely for free, with automatic SSL certificates.

1.  Go to [Render.com](https://render.com/) and sign up using your **GitHub account**.
2.  Click the **New** button at the top of the dashboard and select **Static Site**.
3.  Find your `lead-engine` repository in the list and click **Connect**.
4.  **Configure the Build**:
    *   **Name**: Type `lead-engine`
    *   **Build Command**: Type `npm run build`
    *   **Publish directory**: Type `dist`
5.  **Add Your Environment Variables**:
    *   Scroll down and click **Advanced**.
    *   Click **Add Environment Variable**.
    *   **Key**: `API_KEY`
    *   **Value**: Paste your Google Gemini API Key.
    *   *(Note: Apify token is not required here).*
6.  Click **Create Static Site**.
7.  Render will pull your code and build it. You can watch the console logs. Once it finishes, your live URL will be displayed at the top left of the screen.

---

## 🔄 Updating Your Live App

The best part about using these cloud providers is **Continuous Deployment**. 

If you ever want to make a change to the app (like changing a color or adding a new feature):
1. Make the change to the files on your local computer.
2. Go to your repository on GitHub.com.
3. Click "Add file" -> "Upload files" and drag and drop the updated files over the old ones to overwrite them.
4. Vercel, Netlify, or Render will automatically detect the change, rebuild your app, and update your live website within minutes!