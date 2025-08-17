import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const onInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome !== 'accepted') setDeferredPrompt(null);
  };

  if (!canInstall) return null;
  return (
    <Button variant="secondary" onClick={onInstall} aria-label="Instalar PWA">
      Instalar App
    </Button>
  );
}
