import { createFileRoute } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { authActions, useAuth } from '@/stores/auth';
import {
  copyText,
  onBackendEvent,
  openExternalURL,
  startLogin,
} from '@/lib/backend';
import { TextShimmerWave } from '@/components/ui/text-shimmer-wave.jsx';
import microsoftLight from '../assets/images/microsoft-light.svg';

export const Route = createFileRoute('/login')({
  component: RouteComponent,
});

const STATE_MOTION = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.38, 1] },
};

function RouteComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { error, userCode, verificationUri } = useAuth();

  useEffect(() => {
    const stopListeningForCode = onBackendEvent(
      'login:send_received',
      async (payload) => {
        authActions.loginCode(payload);

        const deviceCode = payload?.userCode ?? payload.user_code;

        const verificationUri =
          payload?.verificationUri ?? payload?.verification_uri;

        if (deviceCode) {
          const wasCopied = await copyText(deviceCode);

          if (wasCopied) {
            setCopied(true);

            window.setTimeout(() => {
              setCopied(false);
            }, 3000);
          }
        }

        if (verificationUri) {
          openExternalURL(verificationUri);
        }
      }
    );

    const stopListeningForSuccess = onBackendEvent(
      'login:success',
      (profile) => {
        setIsLoading(false);
        authActions.loginSuccess(profile);
      }
    );

    const stopListeningForError = onBackendEvent('login:error', (message) => {
      setIsLoading(false);
      authActions.loginError(message);
    });

    return () => {
      stopListeningForCode();
      stopListeningForSuccess();
      stopListeningForError();
    };
  }, []);

  const authFlow = async () => {
    if (isLoading) return;

    setIsLoading(true);
    authActions.clearError();

    void startLogin();
  };

  const copyCode = async () => {
    const wasCopied = await copyText(userCode);

    if (!wasCopied) return;

    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden p-6">
      {/* Ambient backdrop - 3 orb design of _app.jsx */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-1/2 h-144 w-4xl -translate-x-1/2 rounded-full bg-(--orb-1) blur-[120px]" />
        <div className="absolute -right-32 bottom-0 h-112 w-160 rounded-full bg-(--orb-2) blur-[100px]" />
        <div className="absolute top-1/3 -left-32 h-96 w-lg rounded-full bg-(--orb-3) blur-[90px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6">
        <span className="text-sm font-thin tracking-[0.2em] text-(--saturn-fg-muted) uppercase">
          Saturn
        </span>
        <motion.div
          layout
          className="bg-background w-full rounded-md border-2 border-(--surface-border) p-8"
        >
          <AnimatePresence mode="wait">
            {error ? (
              <motion.div
                key="error"
                {...STATE_MOTION}
                className="flex flex-col items-center gap-4 text-center"
              >
                <h1 className="text-foreground text-2xl font-extralight tracking-tight">
                  Sign-in failed
                </h1>
                <p className="text-sm font-normal text-red-400">{error}</p>
                <button
                  type="button"
                  onClick={authFlow}
                  className="border-saturn-700/60 bg-saturn-900 text-saturn-100 hover:bg-saturn-800 hover:text-saturn-50 mt-2 h-11 rounded-lg border px-6 text-sm font-thin transition-colors"
                >
                  Try Again
                </button>
              </motion.div>
            ) : userCode ? (
              <motion.div
                key="code"
                {...STATE_MOTION}
                className="flex flex-col items-center gap-5 text-center"
              >
                <div className="flex flex-col gap-1">
                  <h1 className="text-foreground text-xl font-extralight tracking-tight">
                    Enter this code in your browser
                  </h1>
                  <p className="text-muted-foreground text-sm font-normal">
                    Sign in to Microsoft to continue.
                  </p>
                </div>
                <code className="w-full rounded-md border border-(--code-border) bg-(--code-bg) px-6 py-4 font-mono text-3xl tracking-[0.2em] text-(--code-fg)">
                  {userCode}
                </code>

                <div className="flex w-full items-center gap-3">
                  <button
                    type="button"
                    onClick={copyCode}
                    className="text-muted-foreground h-10 flex-1 rounded-md border-2 border-(--surface-border) text-sm font-thin transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover)"
                  >
                    {copied ? 'Copied!' : 'Copy code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openExternalURL(verificationUri)}
                    className="border-saturn-700/60 bg-saturn-900 text-saturn-100 hover:bg-saturn-800 hover:text-saturn-50 h-10 flex-1 rounded-lg border text-sm font-thin transition-colors"
                  >
                    Open Microsoft
                  </button>
                </div>

                <TextShimmerWave
                  className="text-sm font-thin [--base-color:#71717a] [--base-gradient-color:#a18dec]"
                  duration={0.35}
                  spread={0.7}
                  zDistance={0}
                  scaleDistance={1}
                  rotateYDistance={15}
                >
                  Waiting for you to finish sign-in...
                </TextShimmerWave>
              </motion.div>
            ) : (
              <motion.div
                key="default"
                {...STATE_MOTION}
                className="flex flex-col items-center gap-5 text-center"
              >
                <div className="flex flex-col gap-1">
                  <h1 className="text-foreground text-2xl font-extralight tracking-tight">
                    Sign in
                  </h1>
                  <p className="text-muted-foreground text-sm font-normal">
                    Continue with your Microsoft account to launch Minecraft.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={authFlow}
                  disabled={isLoading}
                  className="border-saturn-700/60 bg-saturn-900 text-saturn-100 hover:bg-saturn-800 hover:text-saturn-50 flex h-11 w-full items-center justify-center gap-3 rounded-lg border px-6 text-sm font-thin transition-colors disabled:pointer-events-none disabled:opacity-40"
                >
                  {isLoading ? (
                    'Opening browser...'
                  ) : (
                    <>
                      <img
                        src={microsoftLight}
                        alt=""
                        className="size-4 shrink-0"
                      />
                      <span>Sign in with Microsoft</span>
                    </>
                  )}
                </button>
                <p className="text-muted-foreground text-xs font-thin">
                  Only Microsoft accounts are supported.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        <span className="text-muted-foreground text-xs font-thin">
          Saturn Launcher
        </span>
      </div>
    </div>
  );
}
