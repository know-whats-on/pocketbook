import { useState } from 'react';
import { Shield, Zap, Download, CheckCircle } from 'lucide-react';
import { storage, ThemePreference, NudgeIntensity, FollowUpTiming } from '../../lib/storage';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [followUpTiming, setFollowUpTiming] = useState<FollowUpTiming>('3d');
  const [calendarReminders, setCalendarReminders] = useState(true);

  const handleStep1Continue = () => {
    setStep(2);
  };

  const handleStep2Continue = () => {
    // Save preferences
    storage.setThemePreference('dark');
    storage.setNudgeIntensity('low');
    storage.setDefaultFollowUpTiming(followUpTiming);
    storage.setCalendarRemindersEnabled(calendarReminders);
    setStep(3);
  };

  const handleFinish = () => {
    storage.setHasCompletedOnboarding(true);
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-zinc-950 z-50 overflow-hidden flex flex-col">
      {/* Progress indicator - CLEAR and always visible */}
      <div className="absolute top-6 left-0 right-0 z-20 flex justify-center gap-2 px-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 max-w-[80px] rounded-full transition-all ${
              i === step ? 'bg-primary' : i < step ? 'bg-primary/60' : 'bg-zinc-700'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full h-full max-w-md">
          {step === 1 && <Step1 onContinue={handleStep1Continue} />}
          {step === 2 && (
            <Step2
              followUpTiming={followUpTiming}
              setFollowUpTiming={setFollowUpTiming}
              calendarReminders={calendarReminders}
              setCalendarReminders={setCalendarReminders}
              onContinue={handleStep2Continue}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && <Step3 onFinish={handleFinish} />}
        </div>
      </div>
    </div>
  );
}

// Step 1: Value + Privacy - FULL BACKGROUND IMAGE
function Step1({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Full background image */}
      <ImageWithFallback
        src="https://images.unsplash.com/photo-1620500152438-b303ab1e73c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaG9uZSUyMGhhbmQlMjBzb2Z0JTIwbGlnaHRpbmclMjBwb3J0cmFpdHxlbnwxfHx8fDE3NzAzNTkxNjR8MA&ixlib=rb-4.1.0&q=80&w=1080"
        alt="Person holding phone in soft lighting"
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Strong gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-950/60 via-black/80 to-black" />
      
      {/* Content overlay */}
      <div className="relative z-10 flex flex-col h-full justify-between p-6 pt-20 pb-8">
        {/* Top section with headline */}
        <div className="text-center mt-8">
          <h1 className="text-3xl font-medium mb-2 text-white">
            Remember people effortlessly.
          </h1>
          <p className="text-lg text-zinc-200">Offline. Free.</p>
        </div>

        {/* Bottom section with features and CTA */}
        <div className="space-y-6">
          {/* Trust chips - styled like image */}
          <div className="flex flex-wrap gap-3 justify-center">
            <div className="bg-zinc-800/80 backdrop-blur-sm rounded-full px-5 py-2.5 text-sm text-zinc-300">
              No account
            </div>
            <div className="bg-zinc-800/80 backdrop-blur-sm rounded-full px-5 py-2.5 text-sm text-zinc-300">
              Local-only
            </div>
            <div className="bg-zinc-800/80 backdrop-blur-sm rounded-full px-5 py-2.5 text-sm text-zinc-300">
              Export anytime
            </div>
          </div>

          <div className="space-y-3">
            {/* CTA - Continue button - WHITE with BLACK text */}
            <button
              onClick={onContinue}
              className="w-full bg-white hover:bg-zinc-100 text-black rounded-xl py-4 font-semibold text-lg transition-colors shadow-lg"
            >
              Continue
            </button>

            <p className="text-sm text-zinc-400 text-center">Free for everyone. Forever.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 2: Preferences - SIMPLIFIED (no theme, no nudge intensity)
interface Step2Props {
  followUpTiming: FollowUpTiming;
  setFollowUpTiming: (timing: FollowUpTiming) => void;
  calendarReminders: boolean;
  setCalendarReminders: (enabled: boolean) => void;
  onContinue: () => void;
  onBack: () => void;
}

function Step2({
  followUpTiming,
  setFollowUpTiming,
  calendarReminders,
  setCalendarReminders,
  onContinue,
  onBack
}: Step2Props) {
  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Dark background */}
      <div className="absolute inset-0 bg-zinc-950" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full justify-between p-6 pt-20 pb-8">
        <div>
          <h2 className="text-2xl font-medium mb-8 text-white">Your preferences</h2>

          <div className="space-y-6">
            {/* Default Follow-up Timing - Selected option WHITE with BLACK text */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-3">
                Default follow-up
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setFollowUpTiming('24h')}
                  className={`p-4 rounded-xl border-2 transition-all text-base font-medium ${
                    followUpTiming === '24h'
                      ? 'bg-white text-black border-white'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  24h
                </button>
                <button
                  onClick={() => setFollowUpTiming('3d')}
                  className={`p-4 rounded-xl border-2 transition-all text-base font-medium ${
                    followUpTiming === '3d'
                      ? 'bg-white text-black border-white'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  3 days
                </button>
                <button
                  onClick={() => setFollowUpTiming('7d')}
                  className={`p-4 rounded-xl border-2 transition-all text-base font-medium ${
                    followUpTiming === '7d'
                      ? 'bg-white text-black border-white'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  7 days
                </button>
              </div>
            </div>

            {/* Calendar Reminders - YES/NO buttons instead of toggle */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Calendar reminders
              </label>
              <p className="text-sm text-zinc-500 mb-3">Export as .ics files</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCalendarReminders(true)}
                  className={`p-4 rounded-xl border-2 transition-all text-base font-medium ${
                    calendarReminders
                      ? 'bg-white text-black border-white'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setCalendarReminders(false)}
                  className={`p-4 rounded-xl border-2 transition-all text-base font-medium ${
                    !calendarReminders
                      ? 'bg-white text-black border-white'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons at bottom */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl py-3.5 text-base font-medium transition-colors"
          >
            Back
          </button>
          <button
            onClick={onContinue}
            className="flex-1 bg-white hover:bg-zinc-100 text-black rounded-xl py-3.5 text-base font-semibold transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

// Step 3: First Success - FULL BACKGROUND IMAGE
function Step3({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Full background image */}
      <ImageWithFallback
        src="https://images.unsplash.com/photo-1759244328512-e4a9128150f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2ZmZWUlMjBjb252ZXJzYXRpb24lMjBtZWV0aW5nJTIwY2FsbXxlbnwxfHx8fDE3NzAzNTkxNjR8MA&ixlib=rb-4.1.0&q=80&w=1080"
        alt="Coffee conversation"
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Strong gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-950/60 via-black/80 to-black" />
      
      {/* Content overlay */}
      <div className="relative z-10 flex flex-col h-full justify-between p-6 pt-20 pb-8">
        {/* Top section with success icon */}
        <div className="text-center mt-8">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-4xl">👍</span>
          </div>
          <h2 className="text-3xl font-medium mb-2 text-white">You're ready!</h2>
          <p className="text-base text-zinc-200">Save your first meet in 10 seconds</p>
        </div>

        {/* Bottom section with instructions */}
        <div className="space-y-4">
          {/* Instructions - styled like the images */}
          <div className="space-y-3">
            <div className="bg-zinc-800/60 backdrop-blur-sm border border-zinc-700/50 rounded-2xl p-4 flex items-start gap-4">
              <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🤝</span>
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-white mb-1">Quick Meet</p>
                <p className="text-sm text-zinc-400">Tap the + button to save who you met</p>
              </div>
            </div>
            
            <div className="bg-zinc-800/60 backdrop-blur-sm border border-zinc-700/50 rounded-2xl p-4 flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">💭</span>
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-white mb-1">Quick Dump</p>
                <p className="text-sm text-zinc-400">When tired, dump info and triage later</p>
              </div>
            </div>
          </div>

          {/* CTA - Start button - WHITE with BLACK text */}
          <button
            onClick={onFinish}
            className="w-full bg-white hover:bg-zinc-100 text-black rounded-xl py-4 font-semibold text-lg transition-colors shadow-lg"
          >
            Start
          </button>

          <p className="text-sm text-zinc-400 text-center">
            Stored on your phone • Works offline • Free for everyone
          </p>
        </div>
      </div>
    </div>
  );
}