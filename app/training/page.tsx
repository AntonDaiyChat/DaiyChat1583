'use client';

import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase, WorkoutPlan, Exercise } from '@/lib/supabase/client';
import { AIChat } from '@/components/ai/ai-chat';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dumbbell, Clock, CircleCheck as CheckCircle2, Circle, Plus, TrendingUp, CalendarPlus, Flame, Timer, Zap, Chrome as Home, Heart, Target, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { format, addDays, subDays, startOfWeek, isToday, isSameDay, parseISO, subWeeks, addWeeks } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

const quickPrompts = [
  { icon: Home, title: '30 Min. Home Workout', subtitle: 'Ohne Geräte, zu Hause', prompt: 'Erstelle mir ein 30-minütiges Home-Workout ohne Geräte, das ich zu Hause machen kann. 5-6 Übungen.' },
  { icon: Dumbbell, title: 'Oberkörper Gym', subtitle: 'Brust, Schultern, Arme', prompt: 'Erstelle mir ein Oberkörper-Training fürs Gym (Brust, Schultern, Trizeps, Bizeps). 6 Übungen, 60 Minuten.' },
  { icon: Heart, title: 'Cardio & Core', subtitle: 'Ausdauer + Bauch', prompt: 'Erstelle mir ein Cardio- und Core-Workout (30 Min). Mischung aus HIIT und Bauchübungen.' },
  { icon: Target, title: 'Unterkörper', subtitle: 'Beine & Po', prompt: 'Erstelle mir ein Unterkörper-Training (Beine und Po). 5 Übungen, 45 Minuten.' },
];

export default function TrainingPage() {
  return (
    <AppShell>
      <TrainingContent />
    </AppShell>
  );
}

function TrainingContent() {
  const { session } = useAuth();
  const [workout, setWorkout] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDate, setActiveDate] = useState(new Date());

  const dateStr = format(activeDate, 'yyyy-MM-dd');

  const loadWorkout = useCallback(() => {
    if (!session?.user?.id) return;
    setLoading(true);
    supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('date', dateStr)
      .maybeSingle()
      .then(({ data }) => {
        setWorkout(data as WorkoutPlan | null);
        setLoading(false);
      });
  }, [session?.user?.id, dateStr]);

  useEffect(() => {
    loadWorkout();
  }, [loadWorkout]);

  const weekStart = startOfWeek(activeDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const toggleComplete = async () => {
    if (!workout || !session?.user?.id) return;
    const updated = !workout.completed;
    const { error } = await supabase
      .from('workout_plans')
      .update({ completed: updated })
      .eq('id', workout.id);
    if (!error) {
      setWorkout({ ...workout, completed: updated });
      toast.success(updated ? 'Training als erledigt markiert!' : 'Training wieder geöffnet');
    }
  };

  const addToCalendar = async () => {
    if (!workout || !session?.user?.id) return;
    const startTime = new Date(activeDate);
    startTime.setHours(10, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + (workout.duration_minutes || 60));

    const { error } = await supabase.from('events').insert({
      user_id: session.user.id,
      title: workout.title,
      event_type: 'training',
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      linked_workout_id: workout.id,
      color: 'orange',
    });

    if (!error) {
      toast.success('Training zum Kalender hinzugefügt!');
    } else {
      toast.error('Fehler beim Hinzufügen zum Kalender');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-jakarta text-2xl font-bold tracking-tight">Trainingsplan</h2>
          <p className="text-sm text-muted-foreground">
            {format(activeDate, 'EEEE, d. MMMM', { locale: de })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={() => setActiveDate(subDays(activeDate, 1))}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={() => setActiveDate(addDays(activeDate, 1))}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Week Day Selector */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
        {weekDays.map((day) => {
          const isActive = format(day, 'yyyy-MM-dd') === dateStr;
          const isToday = format(new Date(), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
          return (
            <button
              key={format(day, 'yyyy-MM-dd')}
              onClick={() => setActiveDate(day)}
              className={`flex min-w-[56px] flex-col items-center gap-1 rounded-2xl border-2 px-3 py-2.5 transition-all ${
                isActive
                  ? 'border-training bg-training/5 shadow-sm'
                  : 'border-border bg-card hover:border-training/30'
              }`}
            >
              <span className={`text-[10px] font-semibold uppercase ${isActive ? 'text-training' : 'text-muted-foreground'}`}>
                {format(day, 'EE', { locale: de })}
              </span>
              <span className={`text-base font-bold ${isActive ? 'text-training' : ''}`}>
                {format(day, 'd')}
              </span>
              {isToday && <span className="h-1.5 w-1.5 rounded-full bg-training" />}
            </button>
          );
        })}
      </div>

      <Tabs defaultValue="workout" className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-xl">
          <TabsTrigger value="workout" className="text-xs">Workout</TabsTrigger>
          <TabsTrigger value="progress" className="text-xs">Fortschritt</TabsTrigger>
          <TabsTrigger value="ai" className="text-xs">Trainings-KI</TabsTrigger>
        </TabsList>

        {/* Workout Tab */}
        <TabsContent value="workout" className="space-y-3 mt-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 animate-shimmer rounded-2xl" />
              ))}
            </div>
          ) : workout ? (
            <WorkoutView
              workout={workout}
              onToggleComplete={toggleComplete}
              onAddToCalendar={addToCalendar}
              onUpdateExercises={(exercises) => {
                setWorkout({ ...workout, exercises });
              }}
            />
          ) : (
            <EmptyState onQuickPrompt={(prompt) => {
              const event = new CustomEvent('switch-to-ai', { detail: prompt });
              window.dispatchEvent(event);
            }} />
          )}
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-3 mt-4">
          <ProgressTab session={session} />
        </TabsContent>

        {/* AI Chat Tab */}
        <TabsContent value="ai" className="mt-4">
          <AIChat persona="training" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ onQuickPrompt }: { onQuickPrompt: (prompt: string) => void }) {
  return (
    <div className="space-y-4">
      <Card className="flex flex-col items-center justify-center gap-3 p-8 text-center border-dashed border-2 border-training/20">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-training/10">
          <Dumbbell className="h-8 w-8 text-training" />
        </div>
        <div>
          <p className="text-sm font-semibold">Kein Training für diesen Tag</p>
          <p className="text-xs text-muted-foreground mt-1">
            Wähle einen Schnellstart oder frag die Trainings-KI
          </p>
        </div>
      </Card>

      <div>
        <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Schnellstart
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          {quickPrompts.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.title}
                onClick={() => onQuickPrompt(p.prompt)}
                className="group flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-3.5 text-left transition-all hover:border-training/30 hover:bg-training/5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-training/10 transition-colors group-hover:bg-training/20">
                  <Icon className="h-4.5 w-4.5 text-training" />
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">{p.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{p.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-training">
            <Zap className="h-4.5 w-4.5 text-white" />
          </div>
          <p className="text-xs text-muted-foreground">
            Tippe auf eine Kachel, um direkt einen Plan zu generieren – oder beschreibe dein Wunsch-Workout im KI-Chat.
          </p>
        </div>
      </Card>
    </div>
  );
}

function WorkoutView({
  workout,
  onToggleComplete,
  onAddToCalendar,
  onUpdateExercises,
}: {
  workout: WorkoutPlan;
  onToggleComplete: () => void;
  onAddToCalendar: () => void;
  onUpdateExercises: (exercises: Exercise[]) => void;
}) {
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const completedSets = workout.exercises.reduce(
    (sum, ex) => sum + (ex.completedSets?.filter(Boolean).length || 0),
    0
  );
  const progressPercent = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  const toggleSet = async (exIdx: number, setIdx: number) => {
    const exercises = [...workout.exercises];
    const ex = { ...exercises[exIdx] };
    if (!ex.completedSets) ex.completedSets = Array(ex.sets).fill(false);
    ex.completedSets = [...ex.completedSets];
    ex.completedSets[setIdx] = !ex.completedSets[setIdx];
    exercises[exIdx] = ex;
    onUpdateExercises(exercises);

    await supabase
      .from('workout_plans')
      .update({ exercises })
      .eq('id', workout.id);

    if (ex.completedSets[setIdx]) {
      startRestTimer(60);
    } else {
      stopRestTimer();
    }
  };

  const startRestTimer = (seconds: number) => {
    stopRestTimer();
    setRestTimer(seconds);
    timerRef.current = setInterval(() => {
      setRestTimer((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          toast.success('Pause vorbei – weiter gehts!', { duration: 3000 });
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRestTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRestTimer(null);
  };

  useEffect(() => {
    return () => stopRestTimer();
  }, []);

  return (
    <>
      {/* Workout Header */}
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="bg-gradient-training p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-jakarta text-lg font-bold text-white">{workout.title}</h3>
              <div className="mt-1 flex items-center gap-3 text-xs text-white/80">
                {workout.duration_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {workout.duration_minutes} Min
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Dumbbell className="h-3.5 w-3.5" />
                  {workout.exercises.length} Übungen
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {completedSets}/{totalSets} Sätze
                </span>
              </div>
            </div>
            <button
              onClick={onToggleComplete}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition-all hover:bg-white/30"
            >
              {workout.completed ? (
                <CheckCircle2 className="h-6 w-6 text-white" />
              ) : (
                <Circle className="h-6 w-6 text-white/70" />
              )}
            </button>
          </div>

          {/* Progress Bar */}
          {totalSets > 0 && (
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Rest Timer Banner */}
        {restTimer !== null && (
          <div className="flex items-center justify-between bg-training/10 px-4 py-2.5 animate-slide-up">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-training animate-pulse" />
              <span className="text-sm font-semibold text-training">
                Pause: {restTimer}s
              </span>
            </div>
            <button
              onClick={stopRestTimer}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Überspringen
            </button>
          </div>
        )}

        {/* Exercise Cards */}
        <div className="divide-y divide-border/40">
          {workout.exercises.map((ex: Exercise, exIdx: number) => {
            const setsArr = Array.from({ length: ex.sets }, (_, i) => i);
            const exCompleted = ex.completedSets?.filter(Boolean).length || 0;
            const allDone = exCompleted === ex.sets;

            return (
              <div key={exIdx} className="p-4 animate-slide-up" style={{ animationDelay: `${exIdx * 50}ms` }}>
                <div className="mb-3 flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold transition-colors ${
                    allDone ? 'bg-training text-white' : 'bg-training/10 text-training'
                  }`}>
                    {allDone ? <CheckCircle2 className="h-5 w-5" /> : exIdx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{ex.name}</p>
                    {ex.notes && (
                      <p className="text-xs text-muted-foreground">{ex.notes}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {exCompleted}/{ex.sets}
                  </Badge>
                </div>

                {/* Set Rows */}
                <div className="space-y-1.5">
                  {setsArr.map((setIdx) => {
                    const isDone = ex.completedSets?.[setIdx] || false;
                    return (
                      <button
                        key={setIdx}
                        onClick={() => toggleSet(exIdx, setIdx)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                          isDone
                            ? 'border-training/30 bg-training/5'
                            : 'border-border/50 bg-muted/30 hover:border-training/20'
                        }`}
                      >
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg border-2 transition-all ${
                          isDone ? 'border-training bg-training' : 'border-muted-foreground/30'
                        }`}>
                          {isDone ? (
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground/40" />
                          )}
                        </div>

                        <span className={`text-xs font-bold ${isDone ? 'text-training' : 'text-muted-foreground'}`}>
                          Satz {setIdx + 1}
                        </span>

                        <div className="ml-auto flex items-center gap-4 text-xs">
                          <div className="text-center">
                            <span className={`font-bold ${isDone ? 'text-training' : ''}`}>{ex.reps}</span>
                            <span className="ml-1 text-[10px] text-muted-foreground">Wdh</span>
                          </div>
                          <div className="text-center">
                            <span className={`font-bold ${isDone ? 'text-training' : ''}`}>{ex.weight}</span>
                            <span className="ml-1 text-[10px] text-muted-foreground">kg</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 p-4 pt-3 border-t border-border/40">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 rounded-xl text-xs"
            onClick={onAddToCalendar}
          >
            <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
            Zum Kalender
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 rounded-xl text-xs text-training hover:text-training"
            onClick={() => toast.info('Plan wird angepasst…')}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Plan anpassen
          </Button>
        </div>
      </Card>
    </>
  );
}

function ProgressTab({ session }: { session: any }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [workouts, setWorkouts] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const refDate = subWeeks(new Date(), -weekOffset);
  const weekStart = startOfWeek(refDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const weekKey = format(weekStart, 'yyyy-MM-dd');

  useEffect(() => {
    if (!session?.user?.id) return;
    setLoading(true);
    supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('date', format(weekStart, 'yyyy-MM-dd'))
      .lte('date', format(weekEnd, 'yyyy-MM-dd'))
      .order('date', { ascending: true })
      .then(({ data }) => {
        setWorkouts((data as WorkoutPlan[]) || []);
        setLoading(false);
      });
  }, [session?.user?.id, weekKey]);

  const completedCount = workouts.filter((w) => w.completed).length;
  const totalExercises = workouts.reduce((sum, w) => sum + w.exercises.length, 0);
  const totalMinutes = workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);

  const dayHasWorkout = (day: Date) =>
    workouts.some((w) => isSameDay(parseISO(w.date), day));

  return (
    <>
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg"
          onClick={() => setWeekOffset(weekOffset - 1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm font-semibold">
          {format(weekStart, 'd.M.', { locale: de })}–{format(weekEnd, 'd.M.yyyy', { locale: de })}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg"
          onClick={() => setWeekOffset(weekOffset + 1)}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Stats */}
      <Card className="p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-training" />
          <h3 className="font-jakarta text-base font-bold">Trainingsfortschritt</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center gap-1 rounded-xl bg-training/5 p-3">
            <span className="text-2xl font-bold text-training">{completedCount}</span>
            <span className="text-[10px] text-muted-foreground text-center">Abgeschlossen</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-training/5 p-3">
            <span className="text-2xl font-bold text-training">{totalExercises}</span>
            <span className="text-[10px] text-muted-foreground text-center">Übungen</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-training/5 p-3">
            <span className="text-2xl font-bold text-training">{totalMinutes}</span>
            <span className="text-[10px] text-muted-foreground text-center">Minuten</span>
          </div>
        </div>
      </Card>

      {/* Weekly Activity Chart */}
      <Card className="p-4 shadow-sm">
        <h4 className="mb-3 text-sm font-semibold">Aktivität diese Woche</h4>
        {loading ? (
          <div className="h-32 animate-shimmer rounded-xl" />
        ) : workouts.length > 0 ? (
          <div className="flex items-end justify-between gap-2 h-32">
            {weekDays.map((day) => {
              const dayWorkouts = workouts.filter((w) => isSameDay(parseISO(w.date), day));
              const dayCompleted = dayWorkouts.filter((w) => w.completed).length;
              const hasAny = dayWorkouts.length > 0;
              const height = hasAny ? Math.max((dayCompleted / Math.max(completedCount, 1)) * 100, 15) : 0;

              return (
                <div key={format(day, 'yyyy-MM-dd')} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-1 items-end justify-center">
                    <div
                      className={`w-7 max-w-full rounded-t-lg transition-all duration-500 ${
                        dayCompleted > 0
                          ? 'bg-gradient-to-t from-training to-orange-400'
                          : hasAny
                          ? 'bg-training/20'
                          : 'bg-muted/30'
                      }`}
                      style={{ height: `${height || 4}%`, minHeight: '4px' }}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${
                    isToday(day) ? 'text-training font-bold' : 'text-muted-foreground'
                  }`}>
                    {format(day, 'EE', { locale: de })}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <Flame className="h-10 w-10 text-training/30" />
              <p className="text-xs text-muted-foreground">
                Noch keine Daten. Starte dein erstes Workout!
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Progressive Overload Info */}
      <Card className="p-4 shadow-sm">
        <h4 className="mb-2 text-sm font-semibold">Progressive Overload</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Verfolge deine Gewichtssteigerungen über Zeit. Die Trainings-KI empfiehlt dir automatisch,
          wann du das Gewicht erhöhen solltest.
        </p>
      </Card>
    </>
  );
}
