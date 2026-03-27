import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Setting the third parameter to '' forces Vite to load ALL variables, bypassing the VITE_ prefix requirement.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Safely injects the API_KEY so it's globally available to the Google GenAI SDK
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    }
  };
});