const status = document.getElementById('status');
const query = new URLSearchParams(window.location.search);
const action = query.get('action');

function setStatus(message) {
  if (status) {
    status.textContent = message;
  }
}

const DEFAULT_SCOPE = 'user-read-private user-read-email streaming user-read-playback-state user-modify-playback-state';

if (action === 'authorize') {
  handleAuthorize();
} else if (action === 'callback') {
  handleCallback();
} else {
  setStatus('Loading Spotify proxy bridge…');
  setupBridge();
}

function handleAuthorize() {
  const clientId = query.get('client_id');
  const redirectScheme = query.get('redirect_scheme');
  const scope = query.get('scope') || DEFAULT_SCOPE;
  const state = query.get('state') || crypto.randomUUID();

  if (!clientId || !redirectScheme) {
    setStatus('Missing client information.');
    return;
  }

  const callback = new URL(window.location.href);
  callback.searchParams.set('action', 'callback');
  callback.searchParams.set('state', state);
  callback.searchParams.set('redirect_scheme', redirectScheme);
  callback.hash = '';

  const authorizeUrl = new URL('https://accounts.spotify.com/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('response_type', 'token');
  authorizeUrl.searchParams.set('redirect_uri', callback.toString());
  authorizeUrl.searchParams.set('scope', scope);
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('show_dialog', 'true');

  setStatus('Redirecting to Spotify…');
  window.location.replace(authorizeUrl.toString());
}

function handleCallback() {
  const fragment = window.location.hash.startsWith('#')
    ? window.location.hash.substring(1)
    : '';
  const params = new URLSearchParams(fragment);
  const redirectScheme = query.get('redirect_scheme') || 'hubitatdashboard';
  const state = query.get('state');

  if (state && params.get('state') !== state) {
    setStatus('State verification failed. Please restart authentication.');
    return;
  }

  if (!params.get('access_token')) {
    setStatus('Missing access token in Spotify response.');
    return;
  }

  const redirectUrl = `${redirectScheme}://auth#${params.toString()}`;
  setStatus('Returning control to the application…');
  window.location.replace(redirectUrl);
}

function setupBridge() {
  const pending = new Map();

  window.spotifyBridge = {
    performEncodedRequest(base64) {
      try {
        const decoded = JSON.parse(atob(base64));
        processRequest(decoded);
      } catch (error) {
        console.error('Failed to decode request', error);
      }
    }
  };

  setStatus('Bridge ready. Waiting for commands…');

  async function processRequest(request) {
    const { id, method, path, body, accessToken } = request;
    if (!id || !method || !path || !accessToken) {
      return respond({ id, status: 400, error: 'Invalid request payload.' });
    }

    try {
      const endpoint = new URL(path, 'https://api.spotify.com');
      const headers = new Headers({
        Authorization: `Bearer ${accessToken}`
      });
      if (body) {
        headers.set('Content-Type', 'application/json');
      }

      const response = await fetch(endpoint.toString(), {
        method,
        headers,
        body: body ? decodeBase64(body) : undefined
      });

      const buffer = await response.arrayBuffer();
      const base64Body = buffer.byteLength ? encodeBase64(buffer) : null;

      if (!response.ok) {
        const errorText = buffer.byteLength
          ? new TextDecoder().decode(new Uint8Array(buffer))
          : response.statusText;
        return respond({ id, status: response.status, error: errorText });
      }

      respond({ id, status: response.status, body: base64Body });
    } catch (error) {
      respond({ id: request.id, status: 500, error: error.message });
    }
  }

  function respond(payload) {
    const channel = window.webkit?.messageHandlers?.spotifyProxy;
    const encoded = btoa(JSON.stringify(payload));
    if (channel && typeof channel.postMessage === 'function') {
      channel.postMessage(encoded);
    } else {
      console.log('Bridge response', payload);
    }
  }
}

function encodeBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decodeBase64(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
