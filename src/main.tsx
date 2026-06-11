import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global Fetch Interceptor to route relative API calls from non-standard frames
const { fetch: originalFetch } = window;

window.fetch = async function (input, init) {
  let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  
  const isApiCall = url.includes('/api/');
  
  if (isApiCall) {
    const currentHost = window.location.hostname;
    
    // Standard environments where API runs locally or relative-routed
    const isStandardEnvironment = 
      currentHost.includes(".run.app") || 
      currentHost.includes("localhost") || 
      currentHost === "localhost" || 
      currentHost === "127.0.0.1";
      
    if (!isStandardEnvironment) {
      const backendUrl = "https://ais-pre-ztyvz4czqqphjogv3uekw5-210258902427.europe-west1.run.app";
      const isAbsolute = url.startsWith('http://') || url.startsWith('https://');
      
      const oldUrl = url;
      if (isAbsolute) {
        try {
          const parsed = new URL(url);
          url = `${backendUrl}${parsed.pathname}${parsed.search}`;
        } catch (e) {
          if (url.includes('/api/')) {
            const apiIndex = url.indexOf('/api/');
            url = `${backendUrl}${url.substring(apiIndex)}`;
          }
        }
      } else {
        const apiPath = url.startsWith('/') ? url : `/${url}`;
        url = `${backendUrl}${apiPath}`;
      }
      console.warn(`[API Proxy Redirect] Client hostname "${currentHost}" is non-standard. Rewrote API call: "${oldUrl}" -> "${url}"`);
    }
  }

  if (typeof input === 'string') {
    return originalFetch(url, init);
  } else if (input instanceof URL) {
    return originalFetch(url, init);
  } else {
    const newRequest = new Request(url, input);
    return originalFetch(newRequest, init);
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
