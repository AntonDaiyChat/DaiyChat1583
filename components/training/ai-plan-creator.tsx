'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, ArrowRight, ArrowLeft, Loader as Loader2, Check, Dumbbell, Clock, Target, Chrome as Home, Heart, Zap } from 'lucide-react';
import { Exercise, supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

type MuscleGroup = 'ganzkoerper' | 'oberkoerper' | 'unterkoerper' | 'cardio' | 'core';
type Location = 'gym' | 'home' | 'outdoor';
type Experience = 'anfaenger' | 'fortgeschritten' | 'erfahren';

const muscleGroups: { id: MuscleGroup; label: string; icon: typeof Dumbbell }[] = [
  { id: 'ganzkoerper', label: 'Ganzkörper', icon: Dumbbell },
  { id: 'oberkoerper', label: 'Oberkörper', icon: Target },
  { id: 'unterkoerper', label: 'Unterkörper', icon: Zap },
  { id: 'cardio', label: 'Cardio', icon: Heart },
  { id: 'core', label: 'Core/Bauch', icon: Check },
];

const locations: { id: Location; label: string }[] = [
  { id: 'gym', label: 'Fitnessstudio' },
  { id: 'home', label: 'Zu Hause' },
  { id: 'outdoor', label: 'Draußen' },
];

const experiences: { id: Experience; label: string }[] = [
  { id: 'anfaenger', label: 'Anfänger' },
  { id: 'fortgeschritten', label: 'Fortgeschritten' },
  { id: 'erfahren', label: 'Erfahren' },
];

export function AIPlanCreator() {
  const { session } = useAuth();
  const [step, setStep] = useState(0);
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | ''>('');
  const [location, setLocation] = useState<Location | ''>('');
  const [experience, setExperience] = useState<Experience | ''>('');
  const [duration, setDuration] = useState('');
  const [days, setDays] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<{ title: string; exercises: Exercise[] } | null>(null);

  const totalSteps = 5;

  const canProceed = () => {
    switch (step) {
      case 0: return !!muscleGroup;
      case 1: return !!location;
      case 2: return !!experience;
      case 3: return !!duration;
      case 4: return true;
      default: return true;
    }
  };

  const generatePlan = async () => {
    if (!session?.user?.id) return;
    setLoading(true);

    const promptText = `Erstelle mir einen Trainingsplan mit folgenden Angaben:
- Fokus: ${muscleGroup}
- Ort: ${location}
- Erfahrung: ${experience}
- Dauer pro Einheit: ${duration} Minuten
- Trainingstage pro Woche: ${days || 'nicht angegeben'}

Bitte gib mir einen konkreten Plan mit 5-7 Übungen. Antworte NUR im JSON-Format:
{"title": "Plan-Titel", "exercises": [{"name": "Übungsname", "sets": 3, "reps": 12, "weight": 0, "notes": "optional"}]}`;

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-persona`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ persona: 'training', message: promptText }),
      });

      if (!response.ok) throw new Error('AI request failed');

      const data = await response.json();
      const aiText = data.response || '';

      // Try to extract JSON from the AI response
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.exercises && Array.isArray(parsed.exercises)) {
            setGeneratedPlan({
              title: parsed.title || 'KI-Trainingsplan',
              exercises: parsed.exercises.map((ex: any) => ({
                name: ex.name || 'Übung',
                sets: ex.sets || 3,
                reps: ex.reps || 12,
                weight: ex.weight || 0,
                notes: ex.notes || '',
              })),
            });
            setLoading(false);
            return;
          }
        } catch {
          // JSON parse failed, fall through to fallback
        }
      }

      // Fallback: generate a plan locally
      setGeneratedPlan(generateFallbackPlan(muscleGroup, experience, parseInt(duration) || 45));
    } catch {
      setGeneratedPlan(generateFallbackPlan(muscleGroup, experience, parseInt(duration) || 45));
    }
    setLoading(false);
  };

  const savePlan = async () => {
    if (!session?.user?.id || !generatedPlan) return;
    const today = format(new Date(), 'yyyy-MM-dd');

    const { data: existing } = await supabase
      .from('workout_plans')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('date', today)
      .maybeSingle();

    if (existing) {
      toast.error('Du hast bereits ein Training für heute.');
      return;
    }

    const { error } = await supabase.from('workout_plans').insert({
      user_id: session.user.id,
      date: today,
      title: generatedPlan.title,
      exercises: generatedPlan.exercises,
      duration_minutes: parseInt(duration) || 45,
      completed: false,
    });

    if (!error) {
      toast.success('KI-Plan gespeichert! Finde es im "Mein Training" Tab.');
      setGeneratedPlan(null);
      setStep(0);
      setMuscleGroup('');
      setLocation('');
      setExperience('');
      setDuration('');
      setDays('');
    } else {
      toast.error('Speichern fehlgeschlagen');
    }
  };

  if (generatedPlan) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Card className="overflow-hidden border-border/60 shadow-sm">
          <div className="bg-gradient-training p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-jakarta text-base font-bold text-white">{generatedPlan.title}</h3>
                <p className="mt-1 text-xs text-white/80">Personalisierter KI-Plan · {generatedPlan.exercises.length} Übungen</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-border/40">
            {generatedPlan.exercises.map((ex, idx) => (
              <div key={idx} className="p-4 animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-training/10 text-sm font-bold text-training">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{ex.name}</p>
                    {ex.notes && <p className="text-xs text-muted-foreground">{ex.notes}</p>}
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {ex.sets}×{ex.reps}{ex.weight > 0 ? ` · ${ex.weight}kg` : ''}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 p-4 pt-3 border-t border-border/40">
            <Button
              variant="secondary"
              onClick={() => setGeneratedPlan(null)}
              className="h-11 rounded-xl text-sm"
            >
              Neu generieren
            </Button>
            <Button
              onClick={savePlan}
              className="h-11 flex-1 rounded-xl bg-gradient-training text-sm font-semibold shadow-md"
            >
              <Check className="mr-2 h-4 w-4" />
              Für heute speichern
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <Card className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-training animate-pulse-ring">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold">KI erstellt deinen Plan…</p>
          <p className="mt-1 text-xs text-muted-foreground">Das dauert nur ein paar Sekunden</p>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-training" />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="bg-gradient-training p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-jakarta text-base font-bold text-white">KI-Plan erstellen</h3>
              <p className="mt-1 text-xs text-white/80 leading-relaxed">
                Beantworte ein paar Fragen und die KI erstellt einen personalisierten Trainingsplan.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4">
          {/* Progress */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Schritt {step + 1} von {totalSteps}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-training transition-all duration-300"
                style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {step === 0 && (
                <div className="space-y-3">
                  <h4 className="font-jakarta text-base font-bold">Welchen Bereich möchtest du trainieren?</h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    {muscleGroups.map((m) => {
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.id}
                          onClick={() => setMuscleGroup(m.id)}
                          className={`flex items-center gap-2.5 rounded-xl border-2 p-3 text-left transition-all ${
                            muscleGroup === m.id
                              ? 'border-training bg-training/5'
                              : 'border-border bg-card hover:border-training/30'
                          }`}
                        >
                          <Icon className={`h-5 w-5 ${muscleGroup === m.id ? 'text-training' : 'text-muted-foreground'}`} />
                          <span className="text-sm font-semibold">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3">
                  <h4 className="font-jakarta text-base font-bold">Wo trainierst du?</h4>
                  <div className="space-y-2">
                    {locations.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => setLocation(l.id)}
                        className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3.5 text-sm font-semibold transition-all ${
                          location === l.id
                            ? 'border-training bg-training/5 text-training'
                            : 'border-border bg-card hover:border-training/30'
                        }`}
                      >
                        {l.label}
                        {location === l.id && <Check className="h-4 w-4 text-training" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <h4 className="font-jakarta text-base font-bold">Wie erfahren bist du?</h4>
                  <div className="space-y-2">
                    {experiences.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => setExperience(e.id)}
                        className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3.5 text-sm font-semibold transition-all ${
                          experience === e.id
                            ? 'border-training bg-training/5 text-training'
                            : 'border-border bg-card hover:border-training/30'
                        }`}
                      >
                        {e.label}
                        {experience === e.id && <Check className="h-4 w-4 text-training" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <h4 className="font-jakarta text-base font-bold">Wie lange soll das Training dauern?</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {['30', '45', '60', '75', '90'].map((d) => (
                      <button
                        key={d}
                        onClick={() => setDuration(d)}
                        className={`flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 transition-all ${
                          duration === d
                            ? 'border-training bg-training/5 text-training'
                            : 'border-border bg-card hover:border-training/30'
                        }`}
                      >
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-bold">{d}</span>
                        <span className="text-[10px] text-muted-foreground">Min</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3">
                  <h4 className="font-jakarta text-base font-bold">Wie oft pro Woche?</h4>
                  <p className="text-xs text-muted-foreground">Optional – hilft der KI bei der Planung</p>
                  <div className="grid grid-cols-4 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7'].map((d) => (
                      <button
                        key={d}
                        onClick={() => setDays(d)}
                        className={`flex flex-col items-center gap-0.5 rounded-xl border-2 px-3 py-3 transition-all ${
                          days === d
                            ? 'border-training bg-training/5 text-training'
                            : 'border-border bg-card hover:border-training/30'
                        }`}
                      >
                        <span className="text-lg font-bold">{d}</span>
                        <span className="text-[10px] text-muted-foreground">×/Woche</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-6 flex gap-3">
            {step > 0 && (
              <Button
                onClick={() => setStep(step - 1)}
                variant="secondary"
                className="h-11 rounded-xl px-5"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            {step < totalSteps - 1 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="h-11 flex-1 rounded-xl bg-gradient-training text-sm font-semibold shadow-md"
              >
                Weiter
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <Button
                onClick={generatePlan}
                className="h-11 flex-1 rounded-xl bg-gradient-training text-sm font-semibold shadow-md"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Plan erstellen
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function generateFallbackPlan(muscleGroup: string, experience: string, duration: number): { title: string; exercises: Exercise[] } {
  const plans: Record<string, { title: string; exercises: Exercise[] }> = {
    ganzkoerper: {
      title: 'Ganzkörper-Training',
      exercises: [
        { name: 'Kniebeugen', sets: 3, reps: 12, weight: 0, notes: 'Aufwärmen' },
        { name: 'Liegestütze', sets: 3, reps: 10, weight: 0 },
        { name: 'Ausfallschritte', sets: 3, reps: 10, weight: 0, notes: 'Pro Seite' },
        { name: 'Plank', sets: 3, reps: 30, weight: 0, notes: '30 Sekunden' },
        { name: 'Glute Bridge', sets: 3, reps: 15, weight: 0 },
        { name: 'Superman', sets: 3, reps: 12, weight: 0 },
      ],
    },
    oberkoerper: {
      title: 'Oberkörper-Training',
      exercises: [
        { name: 'Bankdrücken', sets: 4, reps: 8, weight: 60 },
        { name: 'Kurzhantel-Schulterdrücken', sets: 4, reps: 10, weight: 15 },
        { name: 'Latzug', sets: 4, reps: 10, weight: 40 },
        { name: 'Trizepsdrücken', sets: 3, reps: 12, weight: 25 },
        { name: 'Bizeps-Curls', sets: 3, reps: 12, weight: 12 },
      ],
    },
    unterkoerper: {
      title: 'Unterkörper-Training',
      exercises: [
        { name: 'Kniebeugen', sets: 4, reps: 8, weight: 50 },
        { name: 'Ausfallschritte', sets: 3, reps: 12, weight: 20 },
        { name: 'Rumänisches Kreuzheben', sets: 4, reps: 10, weight: 60 },
        { name: 'Beinpresse', sets: 3, reps: 12, weight: 80 },
        { name: 'Wadenheben', sets: 4, reps: 15, weight: 40 },
      ],
    },
    cardio: {
      title: 'Cardio-Training',
      exercises: [
        { name: 'Burpees', sets: 4, reps: 10, weight: 0 },
        { name: 'Mountain Climbers', sets: 4, reps: 30, weight: 0 },
        { name: 'Jumping Jacks', sets: 3, reps: 30, weight: 0 },
        { name: 'High Knees', sets: 3, reps: 30, weight: 0 },
        { name: 'Skater Jumps', sets: 3, reps: 20, weight: 0 },
      ],
    },
    core: {
      title: 'Core-Training',
      exercises: [
        { name: 'Crunches', sets: 4, reps: 20, weight: 0 },
        { name: 'Russian Twists', sets: 4, reps: 20, weight: 0, notes: 'Pro Seite' },
        { name: 'Plank', sets: 3, reps: 45, weight: 0, notes: '45 Sekunden' },
        { name: 'Beinheben', sets: 3, reps: 15, weight: 0 },
        { name: 'Bicycle Crunches', sets: 3, reps: 20, weight: 0 },
      ],
    },
  };

  return plans[muscleGroup] || plans.ganzkoerper;
}
