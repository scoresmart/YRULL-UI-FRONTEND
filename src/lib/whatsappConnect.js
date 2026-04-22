const WA_CONFIG_ID = import.meta.env.VITE_WA_CONFIG_ID || '';

function openEmbeddedSignupPopup() {
  return new Promise((resolve, reject) => {
    if (typeof window.FB === 'undefined') {
      reject(new Error('Facebook SDK not loaded. Please refresh and try again.'));
      return;
    }

    let sessionWabaId = '';
    let sessionPhoneNumberId = '';

    function onFbMessage(event) {
      if (event.origin !== 'https://www.facebook.com') return;
      if (typeof event.data !== 'string') return;

      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;

      if (data.event === 'FINISH') {
        sessionWabaId = data.data?.waba_id || '';
        sessionPhoneNumberId = data.data?.phone_number_id || '';
      } else if (data.event === 'CANCEL') {
        window.removeEventListener('message', onFbMessage);
        reject(new Error('WhatsApp setup was cancelled.'));
      } else if (data.event === 'ERROR') {
        window.removeEventListener('message', onFbMessage);
        reject(new Error(data.data?.error_message || 'Embedded Signup error'));
      }
    }

    window.addEventListener('message', onFbMessage);

    window.FB.login(
      function (response) {
        window.removeEventListener('message', onFbMessage);
        if (!response?.authResponse?.code) {
          reject(new Error('Facebook login was cancelled.'));
          return;
        }
        resolve({
          code: response.authResponse.code,
          waba_id: sessionWabaId,
          phone_number_id: sessionPhoneNumberId,
        });
      },
      {
        config_id: WA_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          feature: 'whatsapp_embedded_signup',
          sessionInfoVersion: 3,
          setup: {},
        },
      },
    );
  });
}

export async function connectWhatsApp(authFetch, apiBase) {
  if (WA_CONFIG_ID) {
    const { code, waba_id, phone_number_id } = await openEmbeddedSignupPopup();
    const res = await authFetch(`${apiBase}/oauth/whatsapp/exchange-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, waba_id, phone_number_id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to connect WhatsApp');
    return data;
  }

  const res = await authFetch(
    `${apiBase}/oauth/whatsapp/authorize?return_origin=${encodeURIComponent(window.location.origin)}`,
  );
  const data = await res.json().catch(() => ({}));
  if (!data.auth_url) throw new Error(data.error || 'Failed to get auth URL');
  window.location.href = data.auth_url;
  return new Promise(() => {});
}
