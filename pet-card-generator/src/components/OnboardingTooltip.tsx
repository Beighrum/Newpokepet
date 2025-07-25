import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, ArrowRight, Upload, Sparkles, Star } from 'lucide-react';

interface OnboardingTooltipProps {
  isVisible: boolean;
  onClose: () => void;
  onGetStarted: () => void;
}

const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({
  isVisible,
  onClose,
  onGetStarted
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Pet Card Generator!",
      description: "Transform your pet photos into amazing collectible cards with AI magic.",
      icon: Sparkles,
      color: "text-purple-600"
    },
    {
      title: "Upload Your Pet's Photo",
      description: "Simply drag and drop or click to upload any photo of your furry friend.",
      icon: Upload,
      color: "text-blue-600"
    },
    {
      title: "Get Unique Rarity Cards",
      description: "Each card gets a special rarity level - from common to legendary!",
      icon: Star,
      color: "text-yellow-600"
    }
  ];

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onGetStarted();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-auto animate-in slide-in-from-bottom-4 duration-300">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className={`w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center ${currentStepData.color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1 h-auto"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {currentStepData.title}
          </h3>
          <p className="text-gray-600 mb-6">
            {currentStepData.description}
          </p>

          {/* Progress indicators */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="disabled:opacity-50"
            >
              Previous
            </Button>
            <Button onClick={nextStep} className="bg-blue-600 hover:bg-blue-700">
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingTooltip;