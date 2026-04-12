import React, { useState } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useI18n } from '../i18n';

export default function ProjectList({
  projects, chapters, onCreate, onSelect, onDelete, onUpdateMembers, isAdmin,
}) {
  const { t } = useI18n();
  const [showForm, setShowForm]       = useState(false);
  const [title, setTitle]             = useState('');
  const [formMembers, setFormMembers] = useState('');
  const [confirmId, setConfirmId]     = useState(null);
  const [managingId, setManagingId]   = useState(null);
  const [memberInput, setMemberInput] = useState('');

  const countFor = (id) => chapters.filter((c) => c.projectId === id).length;

  const parseEmails = (str) =>
    str.split(/[,\n]+/).map((e) => e.trim().toLowerCase()).filter((e) => e.includes('@'));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const members = parseEmails(formMembers);
    onCreate(title.trim(), members);
    setTitle('');
    setFormMembers('');
    setShowForm(false);
  };

  const handleDeleteClick = (e, proj) => {
    e.stopPropagation();
    const count = countFor(proj.id);
    if (confirmId === proj.id) {
      const msg = count > 0
        ? t('confirmDeleteProject').replace('{title}', proj.title).replace('{count}', count)
        : t('confirmDeleteProjectEmpty').replace('{title}', proj.title);
      if (window.confirm(msg)) {
        onDelete(proj);
      }
      setConfirmId(null);
    } else {
      setConfirmId(proj.id);
      setTimeout(() => setConfirmId(null), 3000);
    }
  };

  const openMemberPanel = (e, proj) => {
    e.stopPropagation();
    if (managingId === proj.id) {
      setManagingId(null);
    } else {
      setManagingId(proj.id);
      setMemberInput('');
    }
  };

  const addMember = (proj) => {
    const email = memberInput.trim().toLowerCase();
    if (!email.includes('@')) return;
    const current = proj.members || [];
    if (current.includes(email)) { setMemberInput(''); return; }
    onUpdateMembers(proj.id, [...current, email]);
    setMemberInput('');
  };

  const removeMember = (proj, email) => {
    const current = proj.members || [];
    onUpdateMembers(proj.id, current.filter((m) => m !== email));
  };

  return (
    <div className="chapter-page">
      <header className="app-header">
        <div className="app-header-left">
          <h1 className="app-title"><span>HASAN</span> Script Breakdown</h1>
          <span className="app-sub">{t('appSubtitle')}</span>
        </div>
        <div className="app-header-user">
          {auth.currentUser?.photoURL && (
            <img src={auth.currentUser.photoURL} alt="" className="user-avatar" referrerPolicy="no-referrer" />
          )}
          <span className="user-name">{auth.currentUser?.displayName?.split(' ')[0]}</span>
          <button className="btn-signout" onClick={() => signOut(auth)} title={t('signOut')}>↩</button>
        </div>
      </header>

      <div className="chapter-body">
        <div className="chapter-section-label">
          {projects.length === 0
            ? t('noProjects')
            : `${projects.length} ${projects.length === 1 ? t('projectSingular') : t('projects')}`}
        </div>

        <div className="chapter-grid">
          {projects.map((proj) => {
            const count     = countFor(proj.id);
            const isConfirm = confirmId === proj.id;
            const members   = proj.members || [];
            const isManaging = managingId === proj.id;

            return (
              <div key={proj.id} className={`chapter-card ${isManaging ? 'managing' : ''}`}>
                <div className="chapter-card-inner" onClick={() => !isManaging && onSelect(proj)}>
                  <div className="chapter-card-order">{t('project')}</div>
                  <div className="chapter-card-title">{proj.title}</div>
                  <div className="chapter-card-meta">
                    {count} {count === 1 ? t('chapterSingular') : t('chapters')}
                    {members.length > 0 && ` · ${members.length} ${members.length !== 1 ? t('membersSuffixPlural') : t('membersSuffix')}`}
                  </div>
                  {!isManaging && (
                    <div className="chapter-card-footer">
                      <span className="chapter-open-hint">{t('clickToOpen')}</span>
                      {isAdmin && (
                        <>
                          <button
                            className="chapter-members-btn"
                            onClick={(e) => openMemberPanel(e, proj)}
                            title={t('manageMembers')}
                          >
                            👥
                          </button>
                          <button
                            className={`chapter-delete-btn ${isConfirm ? 'confirm' : ''}`}
                            onClick={(e) => handleDeleteClick(e, proj)}
                            title={isConfirm ? t('confirmDelete') : t('deleteProject')}
                          >
                            {isConfirm ? t('confirmDelete') : '×'}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Member management panel */}
                {isAdmin && isManaging && (
                  <div className="member-panel" onClick={(e) => e.stopPropagation()}>
                    <div className="member-panel-header">
                      <span className="member-panel-title">{t('members')}</span>
                      <button className="member-panel-close" onClick={(e) => openMemberPanel(e, proj)}>✕</button>
                    </div>

                    <div className="member-list">
                      {members.length === 0 && (
                        <div className="member-empty">{t('noMembers')}</div>
                      )}
                      {members.map((email) => (
                        <div key={email} className="member-item">
                          <span className="member-email">{email}</span>
                          <button className="member-remove" onClick={() => removeMember(proj, email)} title={t('removeMember')}>×</button>
                        </div>
                      ))}
                    </div>

                    <div className="member-add-row">
                      <input
                        type="email"
                        className="form-input member-input"
                        placeholder="email@ejemplo.com"
                        value={memberInput}
                        onChange={(e) => setMemberInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMember(proj); } }}
                      />
                      <button className="btn-primary member-add-btn" onClick={() => addMember(proj)}>
                        {t('addMember')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {isAdmin && (!showForm ? (
            <button className="chapter-card chapter-add-card" onClick={() => setShowForm(true)}>
              <div className="chapter-add-icon">＋</div>
              <div className="chapter-add-label">{t('newProject')}</div>
            </button>
          ) : (
            <div className="chapter-card chapter-form-card">
              <form onSubmit={handleSubmit} className="chapter-form">
                <div className="chapter-form-title">{t('newProject')}</div>
                <div className="form-field">
                  <label className="form-label">{t('projectName')}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t('projectNamePlaceholder')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                    autoFocus
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">{t('membersLabel')}</label>
                  <textarea
                    className="form-input"
                    placeholder={t('membersPlaceholder')}
                    value={formMembers}
                    onChange={(e) => setFormMembers(e.target.value)}
                    rows={3}
                    style={{ resize: 'vertical' }}
                  />
                  <div className="form-hint">{t('membersHint')}</div>
                </div>
                <div className="chapter-form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => { setShowForm(false); setTitle(''); setFormMembers(''); }}
                  >
                    {t('cancel')}
                  </button>
                  <button type="submit" className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
                    {t('create')}
                  </button>
                </div>
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
