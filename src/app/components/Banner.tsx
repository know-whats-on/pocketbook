import { X } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useState } from 'react';

interface BannerProps {
  type: 'privacy' | 'calendar' | 'success' | 'triage';
  onDismiss?: () => void;
  onAction?: () => void;
}

export function Banner({ type, onDismiss, onAction }: BannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const bannerConfig = {
    privacy: {
      image: 'https://images.unsplash.com/photo-1666913803308-e6ae5d2a1c96?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YWxraW5nJTIwb3V0c2lkZSUyMGR1c2slMjBldmVuaW5nfGVufDF8fHx8MTc3MDM1OTE2N3ww&ixlib=rb-4.1.0&q=80&w=1080',
      icon: '🔒',
      title: 'Your data stays with you',
      subtitle: 'Stored on this phone • Works offline',
      actionLabel: 'Learn more'
    },
    calendar: {
      image: 'https://images.unsplash.com/photo-1601128688653-7dc405e3ac4d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3cml0aW5nJTIwbm90ZXMlMjBqb3VybmFsJTIwcXVpZXR8ZW58MXx8fHwxNzcwMzU5MTY1fDA&ixlib=rb-4.1.0&q=80&w=1080',
      icon: '📅',
      title: 'Want a gentle reminder?',
      subtitle: 'Add follow-ups to your calendar',
      actionLabel: 'Export .ics'
    },
    success: {
      image: 'https://images.unsplash.com/photo-1642698814853-b0092f54e40b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWElMjBub3RlYm9vayUyMGV2ZW5pbmclMjBjYWxtfGVufDF8fHx8MTc3MDM1OTE2Nnww&ixlib=rb-4.1.0&q=80&w=1080',
      icon: '✅',
      title: 'Saved locally',
      subtitle: 'Your meet is safely stored on device',
      actionLabel: null
    },
    triage: {
      image: 'https://images.unsplash.com/photo-1579027178706-b6b91904d7e6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3JyaWRvciUyMGRvb3J3YXklMjB2ZW51ZSUyMG1pbmltYWx8ZW58MXx8fHwxNzcwMzU5MTY2fDA&ixlib=rb-4.1.0&q=80&w=1080',
      icon: '🧹',
      title: 'Quick triage',
      subtitle: 'You have items waiting in Inbox',
      actionLabel: 'Triage now'
    }
  };

  const config = bannerConfig[type];

  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Background image */}
      <ImageWithFallback
        src={config.image}
        alt={config.title}
        className="w-full h-32 object-cover"
      />
      
      {/* Gradient scrim overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
      
      {/* Content */}
      <div className="absolute inset-0 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-2xl">{config.icon}</span>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-white">{config.title}</h3>
            <p className="text-xs text-zinc-300 mt-0.5">{config.subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {config.actionLabel && onAction && (
            <button
              onClick={onAction}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-medium transition-colors"
            >
              {config.actionLabel}
            </button>
          )}
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className="text-zinc-400 hover:text-white transition-colors p-1"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
