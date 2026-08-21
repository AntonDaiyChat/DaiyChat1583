'use client';

import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase, MealPlan, Meal } from '@/lib/supabase/client';
import { AIChat } from '@/components/ai/ai-chat';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flame, Beef, Wheat, Droplet, RefreshCw, ShoppingBasket, UtensilsCrossed, Clock, Eye, Package, Apple, ShoppingCart, Brain, Leaf, Zap, CircleCheck as CheckCircle2, Circle, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { format, addDays, startOfWeek, isToday, isSameDay, parseISO, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

export default function NutritionPage() {
  return (
    <AppShell>
      <NutritionContent />
    </AppShell>
  );
}

function NutritionContent() {
  const { session } = useAuth();
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDate, setActiveDate] = useState(new Date());

  const dateStr = format(activeDate, 'yyyy-MM-dd');

  const loadMealPlan = useCallback(() => {
    if (!session?.user?.id) return;
    setLoading(true);
    supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('date', dateStr)
      .maybeSingle()
      .then(({ data }) => {
        setMealPlan(data as MealPlan | null);
        setLoading(false);
      });
  }, [session?.user?.id, dateStr]);

  useEffect(() => {
    loadMealPlan();
  }, [loadMealPlan]);

  const weekStart = startOfWeek(activeDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const mealTypeLabels: Record<string, string> = {
    breakfast: 'Frühstück',
    lunch: 'Mittagessen',
    dinner: 'Abendessen',
    snack: 'Snack',
  };

  const mealTypeColors: Record<string, string> = {
    breakfast: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    lunch: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    dinner: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
    snack: 'bg-green-500/10 text-green-600 border-green-500/20',
  };

  const allIngredients = mealPlan?.meals?.flatMap((m) => m.ingredients || []) || [];
  const uniqueIngredients = Array.from(new Set(allIngredients));

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-jakarta text-2xl font-bold tracking-tight">Ernährungsplan</h2>
        <p className="text-sm text-muted-foreground">
          Deine Mahlzeiten und Makros für {format(activeDate, 'EEEE', { locale: de })}
        </p>
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
                  ? 'border-nutrition bg-nutrition/5 shadow-sm'
                  : 'border-border bg-card hover:border-nutrition/30'
              }`}
            >
              <span className={`text-[10px] font-semibold uppercase ${isActive ? 'text-nutrition' : 'text-muted-foreground'}`}>
                {format(day, 'EE', { locale: de })}
              </span>
              <span className={`text-base font-bold ${isActive ? 'text-nutrition' : ''}`}>
                {format(day, 'd')}
              </span>
              {isToday && (
                <span className="h-1.5 w-1.5 rounded-full bg-nutrition" />
              )}
            </button>
          );
        })}
      </div>

      {/* Macro Summary */}
      <Card className="overflow-hidden border-border/60 p-4 shadow-sm">
        <div className="grid grid-cols-4 gap-2">
          <div className="flex flex-col items-center gap-1 rounded-xl bg-nutrition/5 p-2.5">
            <Flame className="h-4 w-4 text-nutrition" />
            <span className="text-base font-bold">{mealPlan?.total_calories || 0}</span>
            <span className="text-[10px] text-muted-foreground">kcal</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-training/5 p-2.5">
            <Beef className="h-4 w-4 text-training" />
            <span className="text-base font-bold">{mealPlan?.total_protein || 0}g</span>
            <span className="text-[10px] text-muted-foreground">Protein</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-warning/5 p-2.5">
            <Wheat className="h-4 w-4 text-warning" />
            <span className="text-base font-bold">{mealPlan?.total_carbs || 0}g</span>
            <span className="text-[10px] text-muted-foreground">Carbs</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-dashboard/5 p-2.5">
            <Droplet className="h-4 w-4 text-dashboard" />
            <span className="text-base font-bold">{mealPlan?.total_fat || 0}g</span>
            <span className="text-[10px] text-muted-foreground">Fett</span>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="meals" className="w-full">
        <TabsList className="grid w-full grid-cols-4 rounded-xl">
          <TabsTrigger value="meals" className="text-xs">Mahlzeiten</TabsTrigger>
          <TabsTrigger value="shopping" className="text-xs">Einkauf</TabsTrigger>
          <TabsTrigger value="principles" className="text-xs">Prinzipien</TabsTrigger>
          <TabsTrigger value="ai" className="text-xs">KI</TabsTrigger>
        </TabsList>

        {/* Meals Tab */}
        <TabsContent value="meals" className="space-y-3 mt-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 animate-shimmer rounded-2xl" />
              ))}
            </div>
          ) : mealPlan && mealPlan.meals.length > 0 ? (
            mealPlan.meals.map((meal: Meal, idx: number) => (
              <MealCard
                key={idx}
                meal={meal}
                mealTypeLabels={mealTypeLabels}
                mealTypeColors={mealTypeColors}
              />
            ))
          ) : (
            <Card className="flex flex-col items-center justify-center gap-3 p-8 text-center border-dashed border-2 border-nutrition/20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-nutrition/10">
                <UtensilsCrossed className="h-8 w-8 text-nutrition" />
              </div>
              <div>
                <p className="text-sm font-semibold">Kein Plan für diesen Tag</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Frag die Ernährungs-KI, um einen Plan zu erstellen
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Shopping List Tab */}
        <TabsContent value="shopping" className="space-y-3 mt-4">
          <ShoppingListTab ingredients={uniqueIngredients} dateStr={dateStr} />
        </TabsContent>

        {/* Principles Tab */}
        <TabsContent value="principles" className="space-y-3 mt-4">
          <PrinciplesTab />
        </TabsContent>

        {/* AI Chat Tab */}
        <TabsContent value="ai" className="mt-4">
          <AIChat persona="nutrition" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MealCard({
  meal,
  mealTypeLabels,
  mealTypeColors,
}: {
  meal: Meal;
  mealTypeLabels: Record<string, string>;
  mealTypeColors: Record<string, string>;
}) {
  const [showIngredients, setShowIngredients] = useState(false);
  const isStandard = meal.type === 'breakfast' || meal.type === 'lunch';

  return (
    <Card className="overflow-hidden border-border/60 shadow-sm animate-slide-up">
      {meal.image_url && (
        <div className="relative h-32 w-full overflow-hidden">
          <img
            src={meal.image_url}
            alt={meal.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
            <h4 className="text-base font-bold text-white">{meal.name}</h4>
            <Badge className={`border ${mealTypeColors[meal.type]}`}>
              {mealTypeLabels[meal.type]}
            </Badge>
          </div>
        </div>
      )}
      <div className="p-4">
        {!meal.image_url && (
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold">{meal.name}</h4>
              {isStandard && (
                <Badge variant="secondary" className="text-[9px] gap-1">
                  <Leaf className="h-2.5 w-2.5" />
                  Standard
                </Badge>
              )}
            </div>
            <Badge className={`border ${mealTypeColors[meal.type]}`}>
              {mealTypeLabels[meal.type]}
            </Badge>
          </div>
        )}
        {meal.image_url && isStandard && (
          <div className="mb-2">
            <Badge variant="secondary" className="text-[9px] gap-1">
              <Leaf className="h-2.5 w-2.5" />
              Standard-Mahlzeit
            </Badge>
          </div>
        )}
        <div className="mb-3 flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1 font-semibold">
            <Flame className="h-3.5 w-3.5 text-nutrition" />
            {meal.calories} kcal
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Beef className="h-3.5 w-3.5" />
            {meal.protein}g
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Wheat className="h-3.5 w-3.5" />
            {meal.carbs}g
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Droplet className="h-3.5 w-3.5" />
            {meal.fat}g
          </span>
        </div>

        {meal.ingredients && meal.ingredients.length > 0 && (
          <>
            <button
              onClick={() => setShowIngredients(!showIngredients)}
              className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>{showIngredients ? 'Zutaten ausblenden' : `${meal.ingredients.length} Zutaten anzeigen`}</span>
              {showIngredients ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showIngredients && (
              <div className="mt-2 flex flex-wrap gap-1.5 animate-fade-in">
                {meal.ingredients.map((ing, i) => (
                  <span key={i} className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                    {ing}
                  </span>
                ))}
              </div>
            )}
          </>
        )}

        <div className="mt-3 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-xs text-nutrition hover:text-nutrition"
            onClick={() => toast.info('Alternative wird generiert…')}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Austauschen
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => toast.info('Ergänzung wird vorgeschlagen…')}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            1-Ergänzung
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ShoppingListTab({ ingredients, dateStr }: { ingredients: string[]; dateStr: string }) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [customItems, setCustomItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');

  const storageKey = `shopping-${dateStr}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setCheckedItems(parsed.checked || {});
        setCustomItems(parsed.custom || []);
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  const saveState = (checked: Record<string, boolean>, custom: string[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ checked, custom }));
    } catch {
      // ignore
    }
  };

  const toggleItem = (item: string) => {
    const updated = { ...checkedItems, [item]: !checkedItems[item] };
    setCheckedItems(updated);
    saveState(updated, customItems);
  };

  const addCustomItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    const updated = [...customItems, trimmed];
    setCustomItems(updated);
    setNewItem('');
    saveState(checkedItems, updated);
  };

  const removeCustomItem = (item: string) => {
    const updated = customItems.filter((i) => i !== item);
    setCustomItems(updated);
    const newChecked = { ...checkedItems };
    delete newChecked[item];
    setCheckedItems(newChecked);
    saveState(newChecked, updated);
  };

  const allItems = [...ingredients, ...customItems];
  const checkedCount = allItems.filter((i) => checkedItems[i]).length;
  const progressPercent = allItems.length > 0 ? Math.round((checkedCount / allItems.length) * 100) : 0;

  return (
    <Card className="p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <ShoppingBasket className="h-5 w-5 text-nutrition" />
        <h3 className="font-jakarta text-base font-bold">Einkaufsliste</h3>
        <Badge variant="secondary" className="ml-auto">{checkedCount}/{allItems.length}</Badge>
      </div>

      {allItems.length > 0 && (
        <div className="mb-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-nutrition transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {allItems.length > 0 ? (
        <div className="space-y-1.5">
          {ingredients.map((ing, i) => {
            const isChecked = checkedItems[ing];
            return (
              <button
                key={`ing-${i}`}
                onClick={() => toggleItem(ing)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 transition-all ${
                  isChecked ? 'border-nutrition/30 bg-nutrition/5' : 'border-border/50 hover:border-nutrition/20'
                }`}
              >
                <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${
                  isChecked ? 'border-nutrition bg-nutrition' : 'border-muted-foreground/30'
                }`}>
                  {isChecked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                </div>
                <span className={`text-sm transition-all ${isChecked ? 'text-muted-foreground line-through' : ''}`}>
                  {ing}
                </span>
              </button>
            );
          })}

          {customItems.map((item, i) => {
            const isChecked = checkedItems[item];
            return (
              <div
                key={`custom-${i}`}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all ${
                  isChecked ? 'border-nutrition/30 bg-nutrition/5' : 'border-border/50'
                }`}
              >
                <button onClick={() => toggleItem(item)} className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${
                  isChecked ? 'border-nutrition bg-nutrition' : 'border-muted-foreground/30'
                }`}>
                  {isChecked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                </button>
                <span className={`flex-1 text-sm transition-all ${isChecked ? 'text-muted-foreground line-through' : ''}`}>
                  {item}
                </span>
                <button
                  onClick={() => removeCustomItem(item)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Keine Einkaufsliste verfügbar. Erstelle einen Ernährungsplan!
        </p>
      )}

      {/* Add custom item */}
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          placeholder="Eigenen Artikel hinzufügen…"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustomItem()}
          className="h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm focus:border-nutrition/40 focus:outline-none"
        />
        <Button
          onClick={addCustomItem}
          variant="secondary"
          size="sm"
          className="h-10 rounded-xl px-3"
          disabled={!newItem.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

type Principle = {
  icon: typeof Eye;
  title: string;
  subtitle: string;
  tips: string[];
  color: string;
};

const principles: Principle[] = [
  {
    icon: Eye,
    title: 'Umgebung optimieren',
    subtitle: 'Visual Prompts & Friction',
    color: 'text-nutrition',
    tips: [
      'Sichtfeld-Regel: Obst, Nüsse und gesunde Snacks stehen direkt griffbereit auf der Arbeitsfläche. Ungesundes wandert ganz nach hinten in den obersten Schrank.',
      'Vorbereitung minimieren: Kaufe vorgewaschenen Salat, tiefgekühltes Gemüse (schon geschnippelt) oder vorgekochte Linsen. Je weniger Schnippelaufwand, desto eher kochst du.',
      'Portionieren auf Vorrat: Nach dem Einkaufen Beeren direkt waschen oder Nüsse in kleine Portionen abpacken. Wenn der Hunger kommt, greifst du ohne Nachdenken zu.',
    ],
  },
  {
    icon: Brain,
    title: 'Regeln vereinfachen',
    subtitle: 'Cognitive Friction reduzieren',
    color: 'text-training',
    tips: [
      'Die 1-Ergänzungs-Regel: Statt komplexe Diäten zu befolgen, machst du bestehende Mahlzeiten mit minimalem Aufwand gesünder. Beispiel: In die Tiefkühlpizza einfach zwei Handvoll frischen Spinat oder Cherrytomaten werfen.',
      'Standard-Frühstück/Lunch: Eliminiere Entscheidungsmüdigkeit. Esse unter der Woche morgens oder mittags immer dasselbe funktionale, gesunde Gericht (z. B. Haferflocken mit Beeren oder ein Protein-Wrap).',
    ],
  },
  {
    icon: ShoppingCart,
    title: 'Einkaufs-Hacks',
    subtitle: 'Impulskäufe vermeiden',
    color: 'text-dashboard',
    tips: [
      'Einkauf per Lieferdienst/Click & Collect: Wer nicht hungrig am Süßwarenregal vorbeilaufen muss, kauft automatisch kein Junkfood.',
      'Nie mit leerem Magen einkaufen: Der physische Widerstand gegen Impulskäufe ist bei Hunger extrem hoch.',
    ],
  },
];

function PrinciplesTab() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);
  const [checkedTips, setCheckedTips] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('nutrition-tips-checked');
      if (stored) setCheckedTips(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const toggleTip = (principleIdx: number, tipIdx: number) => {
    const key = `${principleIdx}-${tipIdx}`;
    const updated = { ...checkedTips, [key]: !checkedTips[key] };
    setCheckedTips(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nutrition-tips-checked', JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  const totalTips = principles.reduce((sum, p) => sum + p.tips.length, 0);
  const checkedCount = Object.values(checkedTips).filter(Boolean).length;

  return (
    <>
      {/* Intro Card */}
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="bg-gradient-nutrition p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-jakarta text-base font-bold text-white">Principle of Least Effort</h3>
              <p className="mt-1 text-xs text-white/80 leading-relaxed">
                Du änderst nicht deine Disziplin, sondern deine Umgebung und deine Routinen so,
                dass die gesunde Wahl automatisch der Weg des geringsten Widerstands wird.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs text-muted-foreground">Umgesetzte Tipps</span>
          <Badge variant="secondary" className="text-[10px]">
            {checkedCount}/{totalTips}
          </Badge>
        </div>
      </Card>

      {/* Principle Cards */}
      {principles.map((p, idx) => {
        const Icon = p.icon;
        const isExpanded = expandedIdx === idx;
        const principleChecked = principles[idx].tips.filter(
          (_, tIdx) => checkedTips[`${idx}-${tIdx}`]
        ).length;

        return (
          <Card key={idx} className="overflow-hidden border-border/60 shadow-sm">
            <button
              onClick={() => setExpandedIdx(isExpanded ? null : idx)}
              className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/30"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-muted ${p.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{p.title}</p>
                <p className="text-[11px] text-muted-foreground">{p.subtitle}</p>
              </div>
              {principleChecked > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {principleChecked}/{p.tips.length}
                </Badge>
              )}
              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {isExpanded && (
              <div className="space-y-2 px-4 pb-4 animate-fade-in">
                {p.tips.map((tip, tIdx) => {
                  const isChecked = checkedTips[`${idx}-${tIdx}`] || false;
                  return (
                    <button
                      key={tIdx}
                      onClick={() => toggleTip(idx, tIdx)}
                      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                        isChecked ? 'border-nutrition/30 bg-nutrition/5' : 'border-border/50 hover:border-nutrition/20'
                      }`}
                    >
                      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                        isChecked ? 'border-nutrition bg-nutrition' : 'border-muted-foreground/30'
                      }`}>
                        {isChecked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <span className={`text-xs leading-relaxed transition-all ${isChecked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {tip}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </>
  );
}
