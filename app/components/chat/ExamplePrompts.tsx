import React from 'react';

const EXAMPLE_PROMPTS = [
  { text: 'Build a Passive-Aggressive To-Do List that nags you every hour you ignore it.' },
  { text: 'Make a Dad Joke Generator that only gets worse the more you use it.' },
  { text: 'Create a Daily Excuse Machine for why you did not finish your side project.' },
  {
    text: 'Spin up a "Mood Swing Weather App" that gives brutally honest forecasts ("You will cry twice before lunch")',
  },
  {
    text: 'Create a Naked Zoom Filter that randomly blurs clothes out on video calls (for educational purposes, obviously)',
  },
  {
    text: 'Design a "Petty Payment Splitter" that calculates and Venmo-requests your friends for things like two fries and a sip of Coke.',
  },
];

export function ExamplePrompts(sendMessage?: { (event: React.UIEvent, messageInput?: string): void | undefined }) {
  return (
    <div id="examples" className="relative flex flex-col gap-9 w-full max-w-3xl mx-auto flex justify-center mt-6">
      <div
        className="flex flex-wrap justify-center gap-2"
        style={{
          animation: '.25s ease-out 0s 1 _fade-and-move-in_g2ptj_1 forwards',
        }}
      >
        {EXAMPLE_PROMPTS.map((examplePrompt, index: number) => {
          return (
            <button
              key={index}
              onClick={(event) => {
                sendMessage?.(event, examplePrompt.text);
              }}
              className="border border-bolt-elements-borderColor rounded-full bg-gray-50 hover:bg-gray-100 dark:bg-gray-950 dark:hover:bg-gray-900 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary px-3 py-1 text-xs transition-theme"
            >
              {examplePrompt.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
