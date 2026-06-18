import { Configuration, LogLevel } from '@azure/msal-browser'

export const msalConfig: Configuration = {
  auth: {
    clientId: '80b1ab75-920b-4394-8367-28f9b30208d0',
    authority: 'https://login.microsoftonline.com/34a308e1-52d3-44a5-a863-e4b2081401a1',
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii || level !== LogLevel.Error) return
        console.error('[MSAL]', message)
      },
    },
  },
}

// Minimal scopes — only need the user's identity (email/name) for the app
// BC API calls go through the proxy server, not through MSAL
export const loginRequest = {
  scopes: ['User.Read'],
}
