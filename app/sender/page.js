'use client';

import { useState, useEffect, useCallback } from 'react';

export default function SenderPage() {
  const [templates, setTemplates] = useState([]);
  const [phone, setPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientType, setRecipientType] = useState('guardian');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // ── Load Templates ────────────────────────────
  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  // ── Template Selection ────────────────────────
  function handleTemplateChange(templateId) {
    setSelectedTemplate(templateId);
    if (templateId) {
      const tmpl = templates.find(t => t.id === templateId);
      if (tmpl) {
        let body = tmpl.body;
        if (recipientName) {
          body = body.replace('{name}', recipientName);
        }
        setMessage(body);
      }
    }
  }

  // ── Update template when name changes ─────────
  useEffect(() => {
    if (selectedTemplate) {
      const tmpl = templates.find(t => t.id === selectedTemplate);
      if (tmpl) {
        let body = tmpl.body;
        if (recipientName) {
          body = body.replace('{name}', recipientName);
        }
        setMessage(body);
      }
    }
  }, [recipientName, selectedTemplate, templates]);

  // ── Submit ────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();

    if (!phone || !message) {
      setFeedback({ type: 'error', text: 'Phone number and message are required.' });
      return;
    }

    setSending(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/sms/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          message,
          recipient_name: recipientName,
          recipient_type: recipientType,
          template_id: selectedTemplate || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setFeedback({ type: 'success', text: '✅ Message queued! Go to Dashboard to verify and send.' });
        // Reset form
        setPhone('');
        setRecipientName('');
        setSelectedTemplate('');
        setMessage('');
      } else {
        setFeedback({ type: 'error', text: `❌ ${data.error}` });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: '❌ Network error. Is the server running?' });
    } finally {
      setSending(false);
    }
  }

  // ── Render ────────────────────────────────────
  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="header-logo">📡</div>
          <div>
            <div className="header-title">GSM SMS Gateway</div>
            <div className="header-subtitle">Bright Tutor • Send SMS</div>
          </div>
        </div>

        <div className="header-right">
          <nav className="nav-links">
            <a href="/" className="nav-link">Dashboard</a>
            <a href="/sender" className="nav-link active">Send SMS</a>
          </nav>
        </div>
      </header>

      {/* Sender Form */}
      <div className="sender-container">
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', letterSpacing: '-0.3px' }}>
          📤 Queue New SMS
        </h2>

        <form className="form-card" onSubmit={handleSubmit}>
          {/* Recipient Info */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="recipientName">Recipient Name</label>
              <input
                id="recipientName"
                className="form-input"
                type="text"
                placeholder="e.g. Mr. Ahmed"
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="recipientType">Type</label>
              <select
                id="recipientType"
                className="form-select"
                value={recipientType}
                onChange={e => setRecipientType(e.target.value)}
              >
                <option value="guardian">Guardian</option>
                <option value="tutor">Tutor</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className="form-label" htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              className="form-input"
              type="tel"
              placeholder="017XXXXXXXX"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
            />
            <div className="form-help">Bangladesh mobile number (e.g., 017xxxxxxxx)</div>
          </div>

          <div className="form-divider" />

          {/* Template */}
          <div className="form-group">
            <label className="form-label" htmlFor="template">Message Template</label>
            <select
              id="template"
              className="form-select"
              value={selectedTemplate}
              onChange={e => handleTemplateChange(e.target.value)}
            >
              <option value="">— Custom Message —</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
          </div>

          {/* Message */}
          <div className="form-group">
            <label className="form-label" htmlFor="message">Message</label>
            <textarea
              id="message"
              className="form-textarea"
              placeholder="Type your message here..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
            />
            <div className="form-help">{message.length} characters</div>
          </div>

          {/* Feedback */}
          {feedback && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
              fontWeight: 500,
              background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: feedback.type === 'success' ? '#10b981' : '#ef4444',
              border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            }}>
              {feedback.text}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={sending}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px' }}
          >
            {sending ? (
              <>
                <span className="spinner" /> Queuing...
              </>
            ) : (
              '📤 Queue for Verification'
            )}
          </button>

          <div className="form-help" style={{ textAlign: 'center', marginTop: '10px' }}>
            Message will be queued and shown on the Dashboard for final verification before sending
          </div>
        </form>
      </div>
    </div>
  );
}
