import React, { useEffect, useRef, useState } from "react";
import { api, useStore, Field } from "./core";
let googleLoader;
function loadGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (googleLoader) return googleLoader;
  googleLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    const timeout = setTimeout(() => {
      script.remove();
      googleLoader = null;
      reject(
        new Error(
          "Google is taking too long to load. Please use email sign-in or try again.",
        ),
      );
    }, 12000);
    script.onload = () => {
      clearTimeout(timeout);
      resolve(window.google);
    };
    script.onerror = () => {
      clearTimeout(timeout);
      script.remove();
      googleLoader = null;
      reject(
        new Error(
          "Google could not load in this browser. You can still sign in with email and password.",
        ),
      );
    };
    document.head.appendChild(script);
  });
  return googleLoader;
}
export function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-1.9 4.6-4.1 6v5h6.6c3.9-3.6 6.1-8.8 6.1-14.7Z"
      />
      <path
        fill="#34A853"
        d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2C9.2 39.5 16.1 44 24 44Z"
      />
      <path
        fill="#FBBC05"
        d="M12.6 27.7a12 12 0 0 1 0-7.4v-5.2H5.8a20 20 0 0 0 0 17.8l6.8-5.2Z"
      />
      <path
        fill="#EA4335"
        d="M24 11.9c3 0 5.6 1 7.7 3l5.8-5.8C34 5.9 29.5 4 24 4 16.1 4 9.2 8.5 5.8 15.1l6.8 5.2C14.2 15.5 18.7 11.9 24 11.9Z"
      />
    </svg>
  );
}
export function GoogleSignIn({ onSuccess, link = false }) {
  const { boot, acceptAuth } = useStore();
  const root = useRef(null),
    callback = useRef(onSuccess),
    passwordRef = useRef("");
  callback.current = onSuccess;
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [ready, setReady] = useState(false),
    [attempt, setAttempt] = useState(0),
    [password, setPassword] = useState(""),
    [confirmed, setConfirmed] = useState(!link);
  const configured = boot.google?.configured;
  useEffect(() => {
    if (!configured || !confirmed) return;
    let active = true;
    setError("");
    setReady(false);
    setLoading(true);
    Promise.all([
      loadGoogle(),
      api("/auth/google/challenge", {
        method: "POST",
        body: { purpose: link ? "link" : "login" },
      }),
    ])
      .then(([google, challenge]) => {
        if (!active || !root.current) return;
        google.accounts.id.initialize({
          client_id: boot.google.clientId,
          nonce: challenge.nonce,
          auto_select: false,
          use_fedcm_for_button: false,
          callback: async (result) => {
            if (!active) return;
            setLoading(true);
            setError("");
            try {
              const b = await api("/auth/google", {
                method: "POST",
                body: {
                  credential: result.credential,
                  nonce: challenge.nonce,
                  purpose: link ? "link" : "login",
                  ...(link ? { password: passwordRef.current } : {}),
                },
              });
              const user = await acceptAuth(b);
              if (active) {
                passwordRef.current = "";
                setPassword("");
                callback.current?.(user);
              }
            } catch (e) {
              if (active) {
                setError(e.message);
                setReady(false);
              }
            } finally {
              if (active) setLoading(false);
            }
          },
        });
        root.current.replaceChildren();
        google.accounts.id.renderButton(root.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: "continue_with",
          width: Math.min(360, root.current.clientWidth || 280),
          logo_alignment: "left",
        });
        setReady(true);
        setLoading(false);
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [configured, confirmed, attempt, link, boot.google?.clientId]);
  if (!configured)
    return (
      <div className="google-signin">
        <button className="google-placeholder" type="button" disabled>
          <GoogleMark />
          Continue with Google
        </button>
        <p className="google-note">
          Google sign-in is not connected yet. Please use email and password.
        </p>
      </div>
    );
  return (
    <div className="google-signin">
      {link && !confirmed ? (
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            passwordRef.current = password;
            setConfirmed(true);
          }}
        >
          <Field
            label="Confirm your account password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn outline" type="submit">
            <GoogleMark />
            Connect Google
          </button>
        </form>
      ) : (
        <div
          ref={root}
          className="google-button-host"
          inert={loading || !ready ? true : undefined}
        />
      )}
      {loading && (
        <p className="google-note" role="status">
          Connecting securely to Google…
        </p>
      )}
      {error && (
        <div className="google-error" role="alert">
          <p>{error}</p>
          <button
            className="text-link"
            type="button"
            onClick={() => {
              if (link) {
                setConfirmed(false);
                setError("");
              } else setAttempt((v) => v + 1);
            }}
          >
            Try Google again
          </button>
        </div>
      )}
      {ready && !loading && !error && (
        <p className="google-note">
          Your Google name, email and profile photo are used for your customer
          account.
        </p>
      )}
    </div>
  );
}
