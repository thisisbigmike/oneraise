'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import './CampaignAssistant.css';

export default function CampaignAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/campaign-chat' }),
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoading = status === 'streaming' || status === 'submitted';

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    sendMessage({ text: trimmed });
    setInput('');
  };

  return (
    <div className="campaign-assistant-wrapper">
      {isOpen && (
        <div className="ca-window">
          <div className="ca-header">
            <div className="ca-header-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5DCAA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              OneRaise Assistant
            </div>
            <button className="ca-close-btn" onClick={() => setIsOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div className="ca-messages">
            {messages.length === 0 ? (
              <div className="ca-empty-state">
                <p>Hello! I can help you calculate donations and check real-time Jupiter swap rates.</p>
                <p className="ca-hint">Try asking: &quot;If I donate 50 USDC, how much SOL will the creator receive?&quot;</p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`ca-message ${m.role}`}>
                  <div className="ca-message-bubble">
                    {/* Render text content from parts */}
                    {m.parts?.map((part, i) => {
                      if (part.type === 'text') {
                        return <span key={i}>{part.text}</span>;
                      }
                      if (part.type.startsWith('tool-')) {
                        const toolPart = part as { type: string; toolCallId: string; toolName: string; state: string };
                        const toolName = toolPart.toolName;
                        return (
                          <div key={i} className="ca-tool-call">
                            {toolPart.state === 'result' ? (
                              <span className="ca-tool-success">✓ Checked {toolName === 'getSwapQuote' ? 'Jupiter Swap Rate' : 'Token Price'}</span>
                            ) : (
                              <span className="ca-tool-loading">
                                <span className="ca-spinner"></span> Checking {toolName === 'getSwapQuote' ? 'Jupiter...' : 'Price...'}
                              </span>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              ))
            )}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="ca-message assistant">
                <div className="ca-message-bubble loading-dots">
                  <span>.</span><span>.</span><span>.</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="ca-input-form">
            <input
              className="ca-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about routing or rates..."
              disabled={isLoading}
            />
            <button type="submit" className="ca-send-btn" disabled={isLoading || !input.trim()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      )}

      {!isOpen && (
        <button className="ca-fab" onClick={() => setIsOpen(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
        </button>
      )}
    </div>
  );
}
