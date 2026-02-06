import { useState, useEffect } from 'react';
import { Heart, Zap, Shield, CheckCircle } from 'lucide-react';

interface WelcomeScreenProps {
  onComplete: () => void;
}

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [step, setStep] = useState(0);

  const features = [
    {
      icon: Zap,
      title: "Capture in seconds",
      description: "Record who you met, where, and what's next—all in under 10 seconds. No complex forms."
    },
    {
      icon: Heart,
      title: "Built for neurodivergent folks",
      description: "Low cognitive load. One action per screen. Gentle nudges instead of nagging notifications."
    },
    {
      icon: Shield,
      title: "Your data stays yours",
      description: "Everything lives on your device. No cloud, no tracking, no surprises. Export anytime."
    }
  ];

  return (
    <div className="fixed inset-0 bg-zinc-950 z-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {step < features.length ? (
          <div className="text-center">
            <div className="mb-8 flex justify-center">
              {features.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full mx-1 transition-colors ${
                    index === step ? 'bg-blue-400' : 'bg-zinc-700'
                  }`}
                />
              ))}
            </div>

            <div className="mb-8">
              {(() => {
                const Feature = features[step];
                const Icon = Feature.icon;
                return (
                  <>
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Icon className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-medium mb-3">{Feature.title}</h2>
                    <p className="text-zinc-400 leading-relaxed">{Feature.description}</p>
                  </>
                );
              })()}
            </div>

            <div className="flex gap-3">
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-3 font-medium transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => setStep(step + 1)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 font-medium transition-colors"
              >
                {step === features.length - 1 ? 'Get Started' : 'Next'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-medium mb-3">You're all set!</h2>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              Start by adding your first meet using the + button, or use Quick Dump when you're tired and just need to capture something fast.
            </p>
            <button
              onClick={onComplete}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 font-medium transition-colors"
            >
              Start Using PocketNetwork
            </button>
          </div>
        )}

        <button
          onClick={onComplete}
          className="mt-6 w-full text-zinc-500 text-sm"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
