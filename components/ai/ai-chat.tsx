'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase, Persona, ChatMessage } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

type PersonaConfig = {
  name: string;
  color: string;
  gradient: string;
  description: string;
};

const personaConfigs: Record<Persona, PersonaConfig> = {
  nutrition: {
    name: 'Ernährungs-KI',
    color: 'nutrition',
    gradient: 'bg-gradient-nutrition',
    description: 'Spezialisiert für Mahlzeiten, Rezepte und Makros',
  },
  training: {
    name: 'Trainings-KI',
    color: 'training',
    gradient: 'bg-gradient-training',
    description: 'Spezialisiert für Workouts, Übungen und Progression',
  },
  calendar: {
    name: 'Kalender-KI',
    color: 'calendar',
    gradient: 'bg-gradient-calendar',
    description: 'Spezialisiert für Termine und Zeitplanung',
  },
  dashboard: {
    name: 'Daiy Chat KI',
    color: 'primary',
    gradient: 'bg-gradient-primary',
    description: 'Dein täglicher Überblick und Assistenz',
  },
};

export function AIChat({ persona }: { persona: Persona }) {
  const { session } = useAuth();
  const config = personaConfigs[persona];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    setHistoryLoading(true);
    supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('persona', persona)
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMessages(data as ChatMessage[]);
        } else {
          setMessages([
            {
              id: 'welcome',
              user_id: session.user.id,
              persona,
              role: 'assistant',
              content: `Hallo! Ich bin deine ${config.name}. ${config.description}. Wie kann ich dir helfen?`,
              created_at: new Date().toISOString(),
            },
          ]);
        }
        setHistoryLoading(false);
      });
  }, [session?.user?.id, persona, config.name, config.description]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading || !session?.user?.id) return;
    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      user_id: session.user.id,
      persona,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      await supabase.from('chat_messages').insert({
        user_id: session.user.id,
        persona,
        role: 'user',
        content: userMessage,
      });

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-persona`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ persona, message: userMessage }),
      });

      if (!response.ok) {
        throw new Error('AI request failed');
      }

      const data = await response.json();
      const aiResponse = data.response || 'Entschuldigung, ich konnte keine Antwort generieren.';

      const tempAiMsg: ChatMessage = {
        id: `temp-ai-${Date.now()}`,
        user_id: session.user.id,
        persona,
        role: 'assistant',
        content: aiResponse,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempAiMsg]);

      await supabase.from('chat_messages').insert({
        user_id: session.user.id,
        persona,
        role: 'assistant',
        content: aiResponse,
      });
    } catch (err) {
      console.error('AI chat error', err);
      const fallbackMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        user_id: session.user.id,
        persona,
        role: 'assistant',
        content:
          'Entschuldigung, ich bin gerade nicht erreichbar. Bitte versuche es später erneut.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      toast.error('KI ist gerade nicht erreichbar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold">{config.name}</p>
          <p className="text-[11px] text-muted-foreground">{config.description}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="max-h-[300px] min-h-[180px] overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {historyLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm animate-slide-up ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-white/8 text-foreground rounded-bl-md border border-white/10'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <p className={`mt-1 text-[10px] ${msg.role === 'user' ? 'text-primary-foreground/50' : 'text-muted-foreground'}`}>
                  {format(new Date(msg.created_at), 'HH:mm', { locale: de })}
                </p>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-white/8 border border-white/10 px-3.5 py-2.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Denkt nach…</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 border-t border-white/10 p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={`Frage die ${config.name}…`}
          className="min-h-[44px] max-h-24 flex-1 resize-none rounded-xl border-white/10 bg-white/5 text-sm placeholder:text-muted-foreground/60 focus-visible:border-primary/40"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          size="icon"
          className="h-11 w-11 shrink-0 rounded-xl bg-gradient-primary border-0 shadow-sm hover:opacity-90"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
