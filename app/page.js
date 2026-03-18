'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export default function Dashboard() {
  const [messages, setMessages] = useState([]);
  const [historyMessages, setHistoryMessages] = useState([]);
  const [stats, setStats] = useState({ pending: 0, sentToday: 0, failedToday: 0, totalSent: 0 });
  const [modemStatus, setModemStatus] = useState({ connected: false });
  const [historyFilter, setHistoryFilter] = useState('all');
  const [loadingId, setLoadingId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const prevPendingCount = useRef(0);

  // ── Toast System ──────────────────────────────
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // ── Data Fetching ─────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [msgRes, statsRes, modemRes] = await Promise.all([
        fetch('/api/messages?status=pending'),
        fetch('/api/stats'),
        fetch('/api/modem/status'),
      ]);

      const msgData = await msgRes.json();
      const statsData = await statsRes.json();
      const modemData = await modemRes.json();

      // Check for new messages
      if (msgData.messages && msgData.messages.length > prevPendingCount.current) {
        const diff = msgData.messages.length - prevPendingCount.current;
        if (prevPendingCount.current > 0) {
          addToast(`${diff} new message${diff > 1 ? 's' : ''} in queue`, 'info');
          playChime();
        }
      }
      prevPendingCount.current = msgData.messages?.length || 0;

      setMessages(msgData.messages || []);
      setStats(statsData);
      setModemStatus(modemData);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, [addToast]);

  const fetchHistory = useCallback(async () => {
    try {
      const url = historyFilter === 'all' ? '/api/messages' : `/api/messages?status=${historyFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      setHistoryMessages(data.messages || []);
    } catch (err) {
      console.error('History fetch error:', err);
    }
  }, [historyFilter]);

  useEffect(() => {
    fetchData();
    fetchHistory();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData, fetchHistory]);

  useEffect(() => { fetchHistory(); }, [historyFilter, fetchHistory]);

  // ── Actions ───────────────────────────────────
  async function handleConfirm(id) {
    setLoadingId(id);
    try {
      const res = await fetch('/api/sms/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(`SMS sent${data.simulated ? ' (simulated)' : ''}`, 'success');
      } else {
        addToast(`Failed: ${data.error}`, 'error');
      }
    } catch (err) {
      addToast('Network error', 'error');
    } finally {
      setLoadingId(null);
      fetchData();
      fetchHistory();
    }
  }

  async function handleReject(id) {
    setLoadingId(id);
    try {
      const res = await fetch('/api/sms/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('Message rejected', 'info');
      }
    } catch (err) {
      addToast('Network error', 'error');
    } finally {
      setLoadingId(null);
      fetchData();
      fetchHistory();
    }
  }

  // ── Audio Chime ───────────────────────────────
  function playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) { /* Audio not available */ }
  }

  // ── Helpers ───────────────────────────────────
  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  function formatTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + formatTime(dateStr);
  }

  const signalLevel = modemStatus.signalStrength ? Math.ceil(modemStatus.signalStrength / 20) : 0;

  // ── Render ────────────────────────────────────
  return (
    <div className="app-container">
      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'} {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="header-logo">📡</div>
          <div>
            <div className="header-title">GSM SMS Gateway</div>
            <div className="header-subtitle">Bright Tutor • Local Modem</div>
          </div>
        </div>

        <div className="header-right">
          <nav className="nav-links">
            <a href="/" className="nav-link active">Dashboard</a>
            <a href="/sender" className="nav-link">Send SMS</a>
          </nav>

          <div className="modem-indicator">
            <div className={`modem-dot ${modemStatus.connected ? 'connected' : ''}`} />
            <span>{modemStatus.connected ? (modemStatus.simulated ? 'Simulated' : modemStatus.networkType || 'Connected') : 'Disconnected'}</span>
            <div className="signal-bars">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`signal-bar ${i <= signalLevel ? 'active' : ''}`} />
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card amber">
          <div className="stat-label">Pending</div>
          <div className="stat-value">{stats.pending}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Sent Today</div>
          <div className="stat-value">{stats.sentToday}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Failed Today</div>
          <div className="stat-value">{stats.failedToday}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Total Sent</div>
          <div className="stat-value">{stats.totalSent}</div>
        </div>
      </div>

      {/* Pending Queue */}
      <div className="section-title">
        📬 Pending Messages
        {messages.length > 0 && <span className="badge">{messages.length}</span>}
      </div>

      {messages.length === 0 ? (
        <div className="pending-empty">
          <div className="pending-empty-icon">📭</div>
          <div>No pending messages</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>Messages from the CRM will appear here for verification</div>
        </div>
      ) : (
        <div className="pending-grid">
          {messages.map(msg => (
            <div key={msg.id} className="msg-card">
              <div className="msg-card-header">
                <div className="msg-recipient">
                  <div className="msg-avatar">{getInitials(msg.recipient_name)}</div>
                  <div>
                    <div className="msg-name">{msg.recipient_name || 'Unknown'}</div>
                    <div className="msg-phone">{msg.phone}</div>
                  </div>
                </div>
                <span className={`msg-type-badge ${msg.recipient_type}`}>
                  {msg.recipient_type}
                </span>
              </div>

              <div className="msg-body">{msg.message}</div>

              <div className="msg-footer">
                <div className="msg-time">⏱ {formatTime(msg.created_at)}</div>
                <div className="msg-actions">
                  <button
                    className="btn btn-reject"
                    onClick={() => handleReject(msg.id)}
                    disabled={loadingId === msg.id}
                  >
                    ✕ Reject
                  </button>
                  <button
                    className="btn btn-confirm"
                    onClick={() => handleConfirm(msg.id)}
                    disabled={loadingId === msg.id}
                  >
                    {loadingId === msg.id ? <span className="spinner" /> : '✓'} Confirm & Send
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Message History */}
      <div className="section-title" style={{ marginTop: '8px' }}>
        📋 Message History
      </div>

      <div className="filter-tabs">
        {['all', 'sent', 'failed', 'rejected'].map(f => (
          <button
            key={f}
            className={`filter-tab ${historyFilter === f ? 'active' : ''}`}
            onClick={() => setHistoryFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="history-table-wrapper">
        <table className="history-table">
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Phone</th>
              <th>Message</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {historyMessages.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No messages yet
                </td>
              </tr>
            ) : (
              historyMessages.map(msg => (
                <tr key={msg.id}>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {msg.recipient_name || '—'}
                  </td>
                  <td style={{ fontFamily: "'Courier New', monospace", fontSize: '12px' }}>
                    {msg.phone}
                  </td>
                  <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {msg.message}
                  </td>
                  <td>
                    <span className={`status-pill ${msg.status}`}>{msg.status}</span>
                  </td>
                  <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {formatDate(msg.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
