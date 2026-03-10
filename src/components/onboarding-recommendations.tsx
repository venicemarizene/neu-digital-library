'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Sparkles } from 'lucide-react';

interface Recommendation {
  title: string;
  description: string;
}

interface OnboardingRecommendationsProps {
  recommendations: Recommendation[] | null;
  onClose: () => void;
}

export default function OnboardingRecommendations({ recommendations, onClose }: OnboardingRecommendationsProps) {
  const isOpen = recommendations !== null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Recommended for You
          </DialogTitle>
          <DialogDescription>
            Based on your program, here are some documents you might find helpful.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {recommendations?.map((rec, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="mt-1 flex-shrink-0">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h4 className="font-semibold">{rec.title}</h4>
                <p className="text-sm text-muted-foreground">{rec.description}</p>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Explore the Library</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
