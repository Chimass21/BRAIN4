import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// --- ENHANCED MOBILE & NETLIFY CROSS-ORIGIN FETCH INTERCEPTOR ---
// Automatically detect if running outside of Cloud Run (like Netlify)
// and redirect relative "/api" calls to our real hosted cloud backend.
try {
  const originalFetch = window.fetch;
  const customFetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    let url = "";
    if (typeof input === "string") {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else if (input && typeof input === "object" && "url" in input) {
      url = (input as any).url;
    }

    let isApiCall = false;
    let isAbsolute = url.startsWith("http://") || url.startsWith("https://");

    if (isAbsolute) {
      try {
        const parsed = new URL(url);
        isApiCall = parsed.pathname.startsWith("/api/");
      } catch (e) {
        isApiCall = url.includes("/api/");
      }
    } else {
      isApiCall = url.startsWith("/api/");
    }

    if (isApiCall) {
      const currentHost = window.location.hostname;
      // Standard environments: Cloud Run, localhost dev, and Netlify itself
      const isStandardEnvironment = 
        currentHost.includes(".run.app") || 
        currentHost.includes("localhost") || 
        currentHost.includes("127.0.0.1") ||
        currentHost.includes("netlify.app") ||
        currentHost === "localhost" ||
        currentHost === "127.0.0.1";

      if (!isStandardEnvironment) {
        // Direct all relative Netlify api endpoints to our production Cloud Run engine fallback
        const backendUrl = "https://ais-pre-ztyvz4czqqphjogv3uekw5-210258902427.europe-west1.run.app";
        if (isAbsolute) {
          try {
            const parsed = new URL(url);
            url = `${backendUrl}${parsed.pathname}${parsed.search}`;
          } catch (e) {
            url = `${backendUrl}${url}`;
          }
        } else {
          url = `${backendUrl}${url}`;
        }
      }
    }

    // Inject credentials context for secure cookie session synchronization in cross-origin situations
    if (url.startsWith("http") && !url.includes(window.location.host)) {
      if (!init) init = {};
      if (!init.credentials) {
        init.credentials = "include";
      }
    }

    // Re-invoke fetch handler securely
    if (typeof input === "string") {
      return originalFetch(url, init);
    } else {
      const requestArgs = { ...init };
      // Make sure credentials carries onto actual request streams
      if (!requestArgs.credentials) {
        requestArgs.credentials = "include";
      }
      try {
        return originalFetch(new Request(url, input as RequestInit), requestArgs);
      } catch (e) {
        // Fallback on cloning original request if manual recreation fails
        return originalFetch(input, init);
      }
    }
  };

  // Safe re-definition using Object.defineProperty (handles cases where simple write fails)
  Object.defineProperty(window, 'fetch', {
    value: customFetch,
    configurable: true,
    writable: true,
    enumerable: true
  });
} catch (err) {
  console.warn("Could not patch window.fetch directly due to environment restrictions. Skipping interception.", err);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
