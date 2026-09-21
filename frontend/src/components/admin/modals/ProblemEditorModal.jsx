import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Play, CheckCircle, AlertCircle, Code, FileText, Settings, Database, Check, Eye, Upload, FolderPlus } from 'lucide-react';
import Editor from '@monaco-editor/react';
import api from '../../../services/api';


export const ProblemEditorModal = ({ isOpen, onClose, problemToEdit, onSaveSuccess }) => {
  const [activeSection, setActiveSection] = useState(1); // 1 to 6
  const [activeBoilerLang, setActiveBoilerLang] = useState('python');
  const testCasesEndRef = useRef(null);

  const defaultStarterCode = {
    python: '# Write solution here\nimport sys\n\ndef solve():\n    pass\n\nif __name__ == "__main__":\n    solve()\n',
    cpp: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    // Fast I/O\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    // Write solution here\n    return 0;\n}\n',
    c: '#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    // Write solution here\n    return 0;\n}\n',
    java: 'import java.util.*;\nimport java.io.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write solution here\n    }\n}\n',
    javascript: 'const fs = require("fs");\n\nfunction solve() {\n    const input = fs.readFileSync(0, "utf-8").trim();\n    // Write solution here\n}\n\nsolve();\n'
  };

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    difficulty: 'Medium',
    points: 100,
    isPublic: true,
    tags: 'Arrays, Dynamic Programming',
    description: '',
    inputFormat: '',
    outputFormat: '',
    constraints: '',
    timeLimit: 2000,
    memoryLimit: 256,
    allowedLanguages: ['python', 'cpp', 'c', 'java', 'javascript'],
    testCases: [
      { input: '2 7 11 15\n9', expectedOutput: '0 1', isHidden: false, explanation: 'Because 2 + 7 = 9, indices are 0 and 1.', marks: 10 }
    ],
    starterCode: { ...defaultStarterCode },
    referenceSolution: {
      python: '',
      cpp: '',
      c: '',
      java: '',
      javascript: ''
    },
    referenceLanguage: 'python'
  });

  const handleSingleFileUpload = (idx, field, event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      handleTestCaseChange(idx, field, e.target.result || '');
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleBatchFileImport = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (files.length === 1 && files[0].name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (Array.isArray(parsed)) {
            const imported = parsed.map(tc => ({
              input: String(tc.input || ''),
              expectedOutput: String(tc.expectedOutput || tc.output || ''),
              isHidden: tc.isHidden !== undefined ? Boolean(tc.isHidden) : false,
              explanation: tc.explanation || '',
              marks: tc.marks !== undefined ? Number(tc.marks) : 10
            }));
            setFormData(prev => {
              const newCases = [...prev.testCases, ...imported];
              const newPoints = newCases.reduce((acc, tc) => acc + (Number(tc.marks) || 10), 0);
              return { ...prev, testCases: newCases, points: prev.points > 0 ? prev.points : newPoints };
            });
          }
        } catch (err) {
          alert('Invalid JSON file format. Please upload a JSON array of test cases.');
        }
      };
      reader.readAsText(files[0]);
      event.target.value = '';
      return;
    }

    const filePairs = {};
    let readCount = 0;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result || '';
        const name = file.name;
        const ext = name.substring(name.lastIndexOf('.')).toLowerCase();
        const key = name.replace(/(\.in|\.out|\.txt|\.ans|_in|_out|input|output)/gi, '').trim() || name;

        if (!filePairs[key]) filePairs[key] = { input: '', expectedOutput: '', key };

        if (ext === '.in' || name.toLowerCase().includes('in')) {
          filePairs[key].input = content;
        } else if (ext === '.out' || ext === '.ans' || name.toLowerCase().includes('out') || name.toLowerCase().includes('ans')) {
          filePairs[key].expectedOutput = content;
        } else {
          if (!filePairs[key].input) filePairs[key].input = content;
          else filePairs[key].expectedOutput = content;
        }

        readCount++;
        if (readCount === files.length) {
          const imported = Object.values(filePairs).map(pair => ({
            input: pair.input || '',
            expectedOutput: pair.expectedOutput || '',
            isHidden: false,
            explanation: '',
            marks: 10
          }));
          setFormData(prev => {
            const newCases = [...prev.testCases, ...imported];
            const newPoints = newCases.reduce((acc, tc) => acc + (Number(tc.marks) || 10), 0);
            return { ...prev, testCases: newCases, points: prev.points > 0 ? prev.points : newPoints };
          });
        }
      };
      reader.readAsText(file);
    });
    event.target.value = '';
  };

  const [saving, setSaving] = useState(false);
  const [refExecStatus, setRefExecStatus] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (isOpen && problemToEdit) {
      const loadFullProblem = async () => {
        try {
          const probId = problemToEdit._id || problemToEdit.id || problemToEdit.slug;
          let fullProb = problemToEdit;
          if (probId) {
            try {
              const res = await api.get(`/questions/${probId}`);
              if (res.data && res.data.question) {
                fullProb = res.data.question;
              }
            } catch (err) {
              console.warn('Could not fetch full problem details, falling back to local problem object', err);
            }
          }
          if (!isMounted) return;

          const refLang = fullProb.referenceLanguage || (fullProb.referenceSolution ? Object.keys(fullProb.referenceSolution)[0] : 'python') || 'python';
          const refCode = fullProb.referenceCode || (fullProb.referenceSolution ? fullProb.referenceSolution[refLang] : '') || '';

          const mergedStarterCode = {
            ...defaultStarterCode,
            ...(fullProb.starterCode || {})
          };

          setFormData({
            title: fullProb.title || '',
            slug: fullProb.slug || '',
            difficulty: fullProb.difficulty || 'Medium',
            points: fullProb.points !== undefined && fullProb.points !== null ? Number(fullProb.points) : 100,
            isPublic: fullProb.isPublic !== undefined ? Boolean(fullProb.isPublic) : true,
            tags: Array.isArray(fullProb.tags) ? fullProb.tags.join(', ') : (fullProb.tags || ''),

            description: fullProb.description || '',
            inputFormat: fullProb.inputFormat || '',
            outputFormat: fullProb.outputFormat || '',
            constraints: fullProb.constraints || '',
            timeLimit: fullProb.timeLimit || 2000,
            memoryLimit: fullProb.memoryLimit || 256,
            allowedLanguages: fullProb.allowedLanguages || ['python', 'cpp', 'c', 'java', 'javascript'],
            testCases: fullProb.testCases && fullProb.testCases.length > 0 ? fullProb.testCases : [
              { input: '', expectedOutput: '', isHidden: false, explanation: '', marks: 10 }
            ],
            starterCode: mergedStarterCode,
            referenceCode: refCode,
            referenceLanguage: refLang
          });
        } catch (e) {
          console.error('Error loading problem:', e);
        }
      };
      loadFullProblem();
    } else if (isOpen) {
      setFormData({
        title: '',
        slug: '',
        difficulty: 'Medium',
        points: 100,
        isPublic: true,
        tags: 'Arrays',
        description: '',
        inputFormat: '',
        outputFormat: '',
        constraints: '',
        timeLimit: 2000,
        memoryLimit: 256,
        allowedLanguages: ['python', 'cpp', 'c', 'java', 'javascript'],
        testCases: [
          { input: '', expectedOutput: '', isHidden: false, explanation: '', marks: 10 }
        ],
        starterCode: { ...defaultStarterCode },
        referenceCode: '',
        referenceLanguage: 'python'
      });
    }
    return () => { isMounted = false; };
  }, [problemToEdit, isOpen]);

  if (!isOpen) return null;

  const handleTitleChange = (val) => {
    const generatedSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    setFormData(prev => ({
      ...prev,
      title: val,
      slug: prev.slug && problemToEdit ? prev.slug : generatedSlug
    }));
  };

  const handleAddTestCase = (isHidden = false) => {
    setFormData(prev => {
      const newCases = [...prev.testCases, { input: '', expectedOutput: '', isHidden, explanation: '', marks: 10 }];
      const newPoints = newCases.reduce((acc, tc) => acc + (Number(tc.marks) || 10), 0);
      return {
        ...prev,
        testCases: newCases,
        points: prev.points > 0 ? prev.points : newPoints
      };
    });
    setTimeout(() => {
      testCasesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 50);
  };

  const handleRemoveTestCase = (index) => {
    setFormData(prev => {
      const newCases = prev.testCases.filter((_, idx) => idx !== index);
      const newPoints = newCases.reduce((acc, tc) => acc + (Number(tc.marks) || 10), 0);
      return {
        ...prev,
        testCases: newCases,
        points: prev.points > 0 ? prev.points : newPoints
      };
    });
  };

  const handleTestCaseChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.testCases];
      updated[index] = { ...updated[index], [field]: value };
      const newPoints = updated.reduce((acc, tc) => acc + (Number(tc.marks) || 10), 0);
      return {
        ...prev,
        testCases: updated,
        points: field === 'marks' ? newPoints : (prev.points > 0 ? prev.points : newPoints)
      };
    });
  };

  const handleStarterCodeChange = (lang, codeValue) => {
    setFormData(prev => ({
      ...prev,
      starterCode: {
        ...(prev.starterCode || {}),
        [lang]: codeValue
      }
    }));
  };

  const handleToggleLanguage = (lang) => {
    setFormData(prev => {
      const exists = prev.allowedLanguages.includes(lang);
      return {
        ...prev,
        allowedLanguages: exists
          ? prev.allowedLanguages.filter(l => l !== lang)
          : [...prev.allowedLanguages, lang]
      };
    });
  };

  const handleRunReferenceSolution = async () => {
    try {
      setRefExecStatus({ loading: true, message: 'Running reference solution against test cases...' });
      const sampleTc = formData.testCases[0] || { input: '1 2' };
      const res = await api.post('/submissions/run', {
        language: formData.referenceLanguage,
        code: formData.referenceCode,
        customInput: sampleTc.input
      });
      setRefExecStatus({
        loading: false,
        success: true,
        output: res.data.stdout || res.data.output || 'Execution completed.',
        message: 'Reference solution executed successfully!'
      });
    } catch (err) {
      setRefExecStatus({
        loading: false,
        success: false,
        error: err.response?.data?.message || err.message || 'Execution error'
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      alert('Please fill in required fields (Title and Description)');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        tags: typeof formData.tags === 'string' ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : formData.tags,
        referenceSolution: formData.referenceCode ? { [formData.referenceLanguage]: formData.referenceCode } : {},
        starterCode: formData.starterCode || {},
        skipValidation: true
      };

      if (problemToEdit && (problemToEdit._id || problemToEdit.id)) {
        await api.put(`/questions/${problemToEdit._id || problemToEdit.id}`, payload);
      } else {
        await api.post('/questions', payload);
      }

      onSaveSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving problem:', err);
      alert(err.response?.data?.message || 'Error saving problem');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1.5rem'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '1000px',
        height: '88vh',
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-paper)'
        }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
              {problemToEdit ? 'Edit Problem' : 'Create New Problem'}
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              6-Section Authoring Suite with Custom Boilerplate &amp; Live Preview
            </span>
          </div>

          <button
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Section Tabs Navigator */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-surface)',
          padding: '0 1rem',
          overflowX: 'auto'
        }}>
          {[
            { id: 1, label: '1. Basic Info', icon: FileText },
            { id: 2, label: '2. Statement', icon: Code },
            { id: 3, label: '3. Settings', icon: Settings },
            { id: 4, label: '4. Starter Code', icon: Code },
            { id: 5, label: '5. Test Cases', icon: Database },
            { id: 6, label: '6. Problem Preview', icon: Eye }
          ].map(sec => {

            const Icon = sec.icon;
            const active = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.85rem 1.15rem',
                  border: 'none',
                  background: 'transparent',
                  borderBottom: active ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={15} />
                {sec.label}
              </button>
            );
          })}
        </div>

        {/* Section Content Area */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {/* SECTION 1: BASIC INFO */}
          {activeSection === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  Problem Title <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => handleTitleChange(e.target.value)}
                  placeholder="e.g. Two Sum"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.2fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={e => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="two-sum"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    Difficulty
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none', background: '#FFF' }}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    Points / Score
                  </label>
                  <input
                    type="number"
                    value={formData.points}
                    onChange={e => setFormData({ ...formData, points: parseInt(e.target.value, 10) || 0 })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    Visibility Scope
                  </label>
                  <select
                    value={formData.isPublic ? 'true' : 'false'}
                    onChange={e => setFormData({ ...formData, isPublic: e.target.value === 'true' })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      outline: 'none',
                      background: formData.isPublic ? '#ECFDF5' : '#FEF3C7',
                      color: formData.isPublic ? '#047857' : '#B45309',
                      fontWeight: 700
                    }}
                  >
                    <option value="true">🌐 Public (Practice)</option>
                    <option value="false">🔒 Private (Contest Only)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={e => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="Arrays, Hash Table, Two Pointers"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                />
              </div>
            </div>
          )}

          {/* SECTION 2: PROBLEM STATEMENT */}
          {activeSection === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  Problem Description <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <textarea
                  rows={6}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Given an array of integers nums and an integer target, return indices of the two numbers..."
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    Input Format (STDIN)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.inputFormat}
                    onChange={e => setFormData({ ...formData, inputFormat: e.target.value })}
                    placeholder="First line contains N. Second line contains N integers."
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    Output Format (STDOUT)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.outputFormat}
                    onChange={e => setFormData({ ...formData, outputFormat: e.target.value })}
                    placeholder="Print the solution integers separated by spaces."
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  Constraints (Monospace)
                </label>
                <textarea
                  rows={4}
                  value={formData.constraints}
                  onChange={e => setFormData({ ...formData, constraints: e.target.value })}
                  placeholder={'1 <= N <= 10^5\n-10^9 <= nums[i] <= 10^9\n1 <= target <= 10^9'}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    outline: 'none',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '0.85rem',
                    resize: 'vertical'
                  }}
                />
              </div>

            </div>
          )}

          {/* SECTION 3: EXECUTION SETTINGS */}
          {activeSection === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    Time Limit (Milliseconds)
                  </label>
                  <input
                    type="number"
                    value={formData.timeLimit}
                    onChange={e => setFormData({ ...formData, timeLimit: parseInt(e.target.value, 10) || 2000 })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    Memory Limit (Megabytes)
                  </label>
                  <input
                    type="number"
                    value={formData.memoryLimit}
                    onChange={e => setFormData({ ...formData, memoryLimit: parseInt(e.target.value, 10) || 256 })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.6rem' }}>
                  Supported Execution Languages
                </label>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {[
                    { id: 'python', name: 'Python 3' },
                    { id: 'cpp', name: 'C++17' },
                    { id: 'c', name: 'C' },
                    { id: 'java', name: 'Java 17' },
                    { id: 'javascript', name: 'JavaScript Node.js' }
                  ].map(lang => {
                    const checked = formData.allowedLanguages.includes(lang.id);
                    return (
                      <label key={lang.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.85rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: checked ? 'rgba(46, 94, 255, 0.08)' : 'var(--bg-paper)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600
                      }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleLanguage(lang.id)}
                        />
                        {lang.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: CUSTOM STARTER CODE BOILERPLATE */}
          {activeSection === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                padding: '0.85rem 1.15rem',
                background: 'rgba(79, 70, 229, 0.06)',
                borderRadius: '8px',
                border: '1px solid #C7D2FE',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <Code size={20} color="#4F46E5" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#312E81' }}>
                    Custom Starter / Boilerplate Code Templates
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#4338CA' }}>
                    Pre-populate function signatures, I/O handling, or template wrappers shown to candidates when they select a language in the IDE.
                  </span>
                </div>
              </div>

              {/* Language Selector Bar */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Select Language Template to Customize:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[
                    { id: 'python', name: 'Python 3', monacoLang: 'python' },
                    { id: 'cpp', name: 'C++17', monacoLang: 'cpp' },
                    { id: 'c', name: 'C (GCC)', monacoLang: 'c' },
                    { id: 'java', name: 'Java 17', monacoLang: 'java' },
                    { id: 'javascript', name: 'JavaScript Node.js', monacoLang: 'javascript' }
                  ].map(lang => {
                    const isAllowed = formData.allowedLanguages.includes(lang.id);
                    const isActive = activeBoilerLang === lang.id;
                    return (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => setActiveBoilerLang(lang.id)}
                        className="btn btn-sm"
                        style={{
                          background: isActive ? 'var(--accent-blue)' : '#FFFFFF',
                          color: isActive ? '#FFFFFF' : 'var(--text-ink)',
                          border: isActive ? '1.5px solid var(--accent-blue)' : '1px solid var(--border-color)',
                          fontWeight: isActive ? 700 : 500,
                          fontSize: '0.82rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.45rem 0.9rem'
                        }}
                      >
                        <Code size={13} />
                        {lang.name}
                        {!isAllowed && (
                          <span style={{
                            fontSize: '0.68rem',
                            background: isActive ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
                            color: isActive ? '#FFF' : '#64748B',
                            borderRadius: '4px',
                            padding: '0.1rem 0.35rem',
                            marginLeft: '4px'
                          }}>
                            (Disabled in Settings)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Template Reset Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-slate)' }}>
                  Editing Starter Code for <strong>{activeBoilerLang.toUpperCase()}</strong>:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Reset ${activeBoilerLang} starter template to standard default?`)) {
                      handleStarterCodeChange(activeBoilerLang, defaultStarterCode[activeBoilerLang] || '');
                    }
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                >
                  Reset to Default Template
                </button>
              </div>

              {/* Monaco Code Editor */}
              <div style={{
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)'
              }}>
                <Editor
                  height="340px"
                  language={activeBoilerLang === 'cpp' ? 'cpp' : activeBoilerLang === 'c' ? 'c' : activeBoilerLang}
                  value={formData.starterCode?.[activeBoilerLang] || ''}
                  onChange={(val) => handleStarterCodeChange(activeBoilerLang, val || '')}
                  theme="vs-dark"
                  options={{
                    fontSize: 13,
                    fontFamily: 'IBM Plex Mono, monospace',
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                    lineNumbers: 'on',
                    folding: true,
                    wordWrap: 'on'
                  }}
                />
              </div>
            </div>
          )}

          {/* SECTION 5: TEST CASES */}
          {activeSection === 5 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Test Case Inventory</h4>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FolderPlus size={14} /> Import File(s)
                    <input
                      type="file"
                      multiple
                      accept=".txt,.in,.out,.ans,.json"
                      onChange={handleBatchFileImport}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleAddTestCase(false)}>
                    <Plus size={14} /> Add Sample Case
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => handleAddTestCase(true)}>
                    <Plus size={14} /> Add Hidden Case
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {formData.testCases.map((tc, idx) => (
                  <div key={idx} style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: tc.isHidden ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg-paper)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        Test Case #{idx + 1}
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          background: tc.isHidden ? '#FEF3C7' : '#E0E7FF',
                          color: tc.isHidden ? '#D97706' : '#4F46E5',
                          fontWeight: 700
                        }}>
                          {tc.isHidden ? 'HIDDEN (Evaluation Only)' : 'SAMPLE (Visible)'}
                        </span>
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontWeight: 600 }}>
                          <input
                            type="checkbox"
                            checked={tc.isHidden}
                            onChange={e => handleTestCaseChange(idx, 'isHidden', e.target.checked)}
                          />
                          Hidden Case
                        </label>
                        <button
                          onClick={() => handleRemoveTestCase(idx)}
                          style={{ border: 'none', background: 'transparent', color: '#DC2626', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Input (STDIN)</label>
                          <label style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                            <Upload size={12} /> Load File
                            <input
                              type="file"
                              accept=".txt,.in,.out,.ans,.json"
                              onChange={e => handleSingleFileUpload(idx, 'input', e)}
                              style={{ display: 'none' }}
                            />
                          </label>
                        </div>
                        <textarea
                          rows={3}
                          value={tc.input}
                          onChange={e => handleTestCaseChange(idx, 'input', e.target.value)}
                          placeholder="Input string/numbers or click Load File..."
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Expected Output (STDOUT)</label>
                          <label style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                            <Upload size={12} /> Load File
                            <input
                              type="file"
                              accept=".txt,.in,.out,.ans,.json"
                              onChange={e => handleSingleFileUpload(idx, 'expectedOutput', e)}
                              style={{ display: 'none' }}
                            />
                          </label>
                        </div>
                        <textarea
                          rows={3}
                          value={tc.expectedOutput}
                          onChange={e => handleTestCaseChange(idx, 'expectedOutput', e.target.value)}
                          placeholder="Expected output or click Load File..."
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Explanation / Notes (Sample Case)</label>
                        <textarea
                          rows={2}
                          value={tc.explanation || ''}
                          onChange={e => handleTestCaseChange(idx, 'explanation', e.target.value)}
                          placeholder="e.g. Explanation for sample test case output... Press Enter for next line."
                          style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.85rem', resize: 'vertical' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Test Case Points / Marks</label>
                        <input
                          type="number"
                          min="0"
                          value={tc.marks !== undefined ? tc.marks : 10}
                          onChange={e => handleTestCaseChange(idx, 'marks', parseInt(e.target.value, 10) || 0)}
                          style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.85rem', fontWeight: 600 }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={testCasesEndRef} />
              </div>
            </div>
          )}

          {/* SECTION 6: PROBLEM PREVIEW */}
          {activeSection === 6 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                padding: '0.85rem 1.15rem',
                background: 'rgba(46, 94, 255, 0.08)',
                borderRadius: '8px',
                border: '1px solid var(--accent-blue)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <Eye size={20} color="var(--accent-blue)" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-blue)' }}>Student Workbench Live Preview</div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-slate)' }}>
                    Verify how candidate students will see this problem statement before publishing.
                  </span>
                </div>
              </div>

              {/* Student Workbench Card */}
              <div style={{
                background: 'var(--bg-paper)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
                      {formData.title || 'Untitled Problem'}
                    </h2>
                    <span className={`badge ${formData.difficulty === 'Easy' ? 'badge-easy' : formData.difficulty === 'Medium' ? 'badge-medium' : 'badge-hard'}`}>
                      {formData.difficulty}
                    </span>
                    <span className="badge badge-blue">{formData.points} pts</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-slate)' }}>
                    Time Limit: {formData.timeLimit}ms | Memory: {formData.memoryLimit}MB
                  </div>
                </div>

                {/* Tags */}
                {formData.tags && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {(typeof formData.tags === 'string' ? formData.tags.split(',') : formData.tags).map((tag, i) => (
                      <span key={i} style={{ background: '#FFFFFF', border: '1px solid var(--border-color)', fontSize: '0.75rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '4px', color: 'var(--text-slate)' }}>
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {/* Description */}
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>Problem Description</h4>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {formData.description || 'No description provided.'}
                  </div>
                </div>

                {/* Input Format */}
                {formData.inputFormat && (
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.3rem' }}>Input Format</h4>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-slate)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {formData.inputFormat}
                    </div>
                  </div>
                )}

                {/* Output Format */}
                {formData.outputFormat && (
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.3rem' }}>Output Format</h4>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-slate)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {formData.outputFormat}
                    </div>
                  </div>
                )}

                {/* Constraints */}
                {formData.constraints && (
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.3rem' }}>Constraints</h4>
                    <pre style={{ background: '#FFFFFF', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.82rem', margin: 0, whiteSpace: 'pre-wrap' }}>
                      {formData.constraints}
                    </pre>
                  </div>
                )}

                {/* Public Sample Test Cases */}
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Sample Test Cases (Public)</h4>
                  {formData.testCases.filter(tc => !tc.isHidden).length === 0 ? (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-slate)', fontStyle: 'italic' }}>No public sample test cases configured.</div>
                  ) : (
                    formData.testCases.filter(tc => !tc.isHidden).map((tc, idx) => (
                      <div key={idx} style={{ background: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.85rem', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-slate)', marginBottom: '0.3rem' }}>Sample #{idx + 1}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-slate)', fontWeight: 600 }}>Input (stdin)</span>
                            <pre style={{ margin: '0.2rem 0 0', background: 'var(--bg-paper)', padding: '0.4rem 0.6rem', borderRadius: '4px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8rem' }}>{tc.input}</pre>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-slate)', fontWeight: 600 }}>Expected Output (stdout)</span>
                            <pre style={{ margin: '0.2rem 0 0', background: 'var(--bg-paper)', padding: '0.4rem 0.6rem', borderRadius: '4px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8rem' }}>{tc.expectedOutput}</pre>
                          </div>
                        </div>
                        {tc.explanation && (
                          <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-slate)' }}>
                            <em>Explanation: {tc.explanation}</em>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          background: 'var(--bg-paper)',
          borderTop: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {activeSection > 1 && (
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveSection(activeSection - 1)}>
                Previous Section
              </button>
            )}
            {activeSection < 6 && (
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveSection(activeSection + 1)}>
                Next Section
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : (problemToEdit ? 'Update Problem' : 'Save & Publish Problem')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
