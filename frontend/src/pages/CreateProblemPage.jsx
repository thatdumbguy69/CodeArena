import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import {
  ArrowLeft,
  Save,
  PlusCircle,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Code,
  FileText,
  Sliders,
  Play,
  Eye,
  Check,
  Upload,
  FolderPlus
} from 'lucide-react';


export const CreateProblemPage = ({ problemToEdit, setCurrentTab }) => {
  const [wizardStep, setWizardStep] = useState(1);
  const testCasesEndRef = useRef(null);

  // Metadata State
  const [probTitle, setProbTitle] = useState('');
  const [probDiff, setProbDiff] = useState('Easy');
  const [probCat, setProbCat] = useState('Algorithms');
  const [probTags, setProbTags] = useState(['Algorithms']);
  const [probTime, setProbTime] = useState(2.0);
  const [probMemory, setProbMemory] = useState(256);
  const [probPoints, setProbPoints] = useState(100);
  const [isPublic, setIsPublic] = useState(true);
  const [allowedLangs, setAllowedLangs] = useState(['python', 'cpp', 'c', 'java', 'javascript']);

  // Statement State
  const [probDesc, setProbDesc] = useState('');
  const [probInputFormat, setProbInputFormat] = useState('');
  const [probOutputFormat, setProbOutputFormat] = useState('');
  const [probConstraints, setProbConstraints] = useState('');

  // Test Cases State
  const [testCases, setTestCases] = useState([
    { input: '', expectedOutput: '', isHidden: false, explanation: '', marks: 10 }
  ]);

  // Code Templates & Reference Solution State
  const [starterCode, setStarterCode] = useState({
    c: '#include <stdio.h>\n\nint main() {\n    return 0;\n}',
    cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}',
    java: 'public class Solution {\n    public static void main(String[] args) {\n    }\n}',
    python: 'import sys\n\ndef solve():\n    pass\n\nif __name__ == "__main__":\n    solve()\n',
    javascript: 'const fs = require("fs");\nfunction solve() {\n}\nsolve();\n'
  });
  const [referenceSolution, setReferenceSolution] = useState({
    c: '', cpp: '', java: '', python: '', javascript: ''
  });

  const [activeCodeLang, setActiveCodeLang] = useState('python');
  const [activeRefLang, setActiveRefLang] = useState('python');

  // Submit & Validation State
  const [validatingRef, setValidatingRef] = useState(false);
  const [validationReport, setValidationReport] = useState(null);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    let isMounted = true;
    if (problemToEdit) {
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
              console.warn('Could not fetch full problem details, using local problem object', err);
            }
          }
          if (!isMounted) return;

          setProbTitle(fullProb.title || '');
          setProbDesc(fullProb.description || '');
          setProbInputFormat(fullProb.inputFormat || '');
          setProbOutputFormat(fullProb.outputFormat || '');
          setProbConstraints(fullProb.constraints || '');
          setProbDiff(fullProb.difficulty || 'Easy');
          setProbCat(fullProb.category || 'Algorithms');
          setProbTags(fullProb.tags && fullProb.tags.length > 0 ? fullProb.tags : [fullProb.category || 'Algorithms']);
          setProbTime(fullProb.timeLimit || 2.0);
          setProbMemory(fullProb.memoryLimit || 256);
          setProbPoints(fullProb.points || 100);
          setIsPublic(fullProb.isPublic !== undefined ? Boolean(fullProb.isPublic) : true);
          setAllowedLangs(fullProb.allowedLanguages || ['c', 'cpp', 'java', 'python', 'javascript']);
          setTestCases(fullProb.testCases && fullProb.testCases.length > 0 ? fullProb.testCases : [
            { input: '', expectedOutput: '', isHidden: false, explanation: '', marks: 10 }
          ]);
          setStarterCode(fullProb.starterCode || starterCode);
          setReferenceSolution(fullProb.referenceSolution || referenceSolution);
        } catch (e) {
          console.error('Error loading problem:', e);
        }
      };
      loadFullProblem();
    }
    return () => { isMounted = false; };
  }, [problemToEdit]);

  const addTestCase = () => {
    const updated = [
      ...testCases,
      { input: '', expectedOutput: '', isHidden: false, explanation: '', marks: 10 }
    ];
    setTestCases(updated);
    setProbPoints(prev => (prev > 0 ? prev : updated.reduce((acc, tc) => acc + (Number(tc.marks) || 10), 0)));
    setTimeout(() => {
      testCasesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 50);
  };

  const removeTestCase = (idx) => {
    const updated = testCases.filter((_, i) => i !== idx);
    setTestCases(updated);
    setProbPoints(prev => (prev > 0 ? prev : updated.reduce((acc, tc) => acc + (Number(tc.marks) || 10), 0)));
  };

  const updateTestCase = (idx, field, val) => {
    const updated = [...testCases];
    updated[idx] = { ...updated[idx], [field]: val };
    setTestCases(updated);
    const newPoints = updated.reduce((acc, tc) => acc + (Number(tc.marks) || 10), 0);
    setProbPoints(prev => (field === 'marks' ? newPoints : (prev > 0 ? prev : newPoints)));
  };

  const handleSingleFileUpload = (idx, field, event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      updateTestCase(idx, field, e.target.result || '');
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleBatchFileImport = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Check if single JSON file
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
            const updated = [...testCases, ...imported];
            setTestCases(updated);
            setProbPoints(prev => (prev > 0 ? prev : updated.reduce((acc, tc) => acc + (Number(tc.marks) || 10), 0)));
          }
        } catch (err) {
          alert('Invalid JSON file format. Please upload a JSON array of test cases.');
        }
      };
      reader.readAsText(files[0]);
      event.target.value = '';
      return;
    }

    // Batch text files (.txt, .in, .out, .ans)
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
          const updated = [...testCases, ...imported];
          setTestCases(updated);
          setProbPoints(prev => (prev > 0 ? prev : updated.reduce((acc, tc) => acc + (Number(tc.marks) || 10), 0)));
        }
      };
      reader.readAsText(file);
    });
    event.target.value = '';
  };


  const handleSaveProblem = async () => {
    if (!probTitle.trim()) {
      setWizardStep(1);
      alert('Please enter a problem title.');
      return;
    }
    if (!probDesc.trim()) {
      setWizardStep(2);
      alert('Please enter a problem description.');
      return;
    }
    if (testCases.length === 0) {
      setWizardStep(3);
      alert('Please add at least one test case.');
      return;
    }

    try {
      setValidatingRef(true);
      setValidationError('');
      setValidationReport(null);

      const payload = {
        title: probTitle,
        description: probDesc,
        inputFormat: probInputFormat,
        outputFormat: probOutputFormat,
        constraints: probConstraints,
        difficulty: probDiff,
        category: probCat,
        tags: probTags,
        timeLimit: probTime,
        memoryLimit: probMemory,
        points: probPoints,
        isPublic,
        allowedLanguages: allowedLangs,
        testCases,
        starterCode,
        referenceSolution,
        skipValidation: true
      };

      let res;
      if (problemToEdit && problemToEdit._id) {
        res = await api.put(`/questions/${problemToEdit._id}`, payload);
      } else {
        res = await api.post('/questions', payload);
      }

      const report = res.data.validationReport || { message: res.data.message };
      setValidationReport(report);

      setTimeout(() => {
        setCurrentTab('admin');
      }, 1200);
    } catch (err) {
      console.error('Error saving problem:', err);
      const errMsg = err.response?.data?.message || 'Error saving problem';
      setValidationError(errMsg);
      if (err.response?.data?.validationError) {
        setValidationReport(err.response.data.validationError);
      }
    } finally {
      setValidatingRef(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '1100px' }}>
      
      {/* Top Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => setCurrentTab('admin')} style={{ marginBottom: '0.5rem' }}>
            <ArrowLeft size={14} /> Back to Admin Panel
          </button>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>
            {problemToEdit ? `Edit Problem: ${problemToEdit.title}` : 'Create New Problem Workspace'}
          </h1>
        </div>
        
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="btn btn-secondary" onClick={() => setCurrentTab('admin')}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSaveProblem} disabled={validatingRef}>
            <Save size={16} /> {validatingRef ? 'Saving...' : 'Save & Publish Problem'}
          </button>
        </div>
      </div>

      {/* 5-Section Stepper Navigation Header */}
      <div className="glass-panel" style={{ padding: '0.4rem', marginBottom: '1.8rem', display: 'flex', gap: '0.4rem', overflowX: 'auto' }}>
        {[
          { step: 1, label: '1. Metadata & Limits', icon: Sliders },
          { step: 2, label: '2. Problem Statement', icon: FileText },
          { step: 3, label: '3. Test Cases Manager', icon: CheckCircle2 },
          { step: 4, label: '4. Starter Code Boilerplate', icon: Code },
          { step: 5, label: '5. Student Preview & Publish', icon: Eye }
        ].map(s => {
          const IconComp = s.icon;
          const active = wizardStep === s.step;
          return (
            <button
              key={s.step}
              type="button"
              onClick={() => setWizardStep(s.step)}
              className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                flex: 1,
                justifyContent: 'center',
                padding: '0.6rem 0.8rem',
                fontSize: '0.82rem',
                borderRadius: 'var(--radius-sm)',
                whiteSpace: 'nowrap'
              }}
            >
              <IconComp size={14} /> {s.label}
            </button>
          );
        })}
      </div>

      {/* SECTION 1: METADATA */}
      {wizardStep === 1 && (
        <div className="glass-card" style={{ padding: '1.8rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.2rem' }}>Section 1: Problem Metadata & Execution Limits</h3>

          <div className="form-group" style={{ marginBottom: '1.2rem' }}>
            <label className="form-label">Problem Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Longest Substring Without Repeating Characters"
              value={probTitle}
              onChange={(e) => setProbTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.2fr', gap: '1rem', marginBottom: '1.2rem' }}>
            <div className="form-group">
              <label className="form-label">Difficulty</label>
              <select className="form-select" value={probDiff} onChange={(e) => setProbDiff(e.target.value)}>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Primary Category</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Algorithms"
                value={probCat}
                onChange={(e) => setProbCat(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Base Points / Score Value</label>
              <input
                type="number"
                className="form-input"
                min="10"
                value={probPoints}
                onChange={(e) => setProbPoints(parseInt(e.target.value) || 100)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Visibility Scope</label>
              <select
                className="form-select"
                value={isPublic ? 'true' : 'false'}
                onChange={(e) => setIsPublic(e.target.value === 'true')}
                style={{
                  background: isPublic ? '#ECFDF5' : '#FEF3C7',
                  color: isPublic ? '#047857' : '#B45309',
                  fontWeight: 700
                }}
              >
                <option value="true">🌐 Public (Practice)</option>
                <option value="false">🔒 Private (Contest Only)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
            <div className="form-group">
              <label className="form-label">Time Limit (Seconds per test case)</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                placeholder="e.g. 2.0"
                value={probTime}
                onChange={(e) => setProbTime(parseFloat(e.target.value) || 2.0)}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-slate)', marginTop: '0.2rem', display: 'block' }}>
                Set custom execution time per problem (e.g. 2.0s for DP, 1.0s for Strings).
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Memory Limit (MB)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 256"
                value={probMemory}
                onChange={(e) => setProbMemory(parseInt(e.target.value) || 256)}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-slate)', marginTop: '0.2rem', display: 'block' }}>
                Maximum RAM ceiling allocated per execution sandbox process.
              </span>
            </div>
          </div>

          {/* Topic Tags Multi-Select */}
          <div className="form-group" style={{ marginBottom: '1.2rem' }}>
            <label className="form-label">Topic Tags (Multi-select)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
              {[
                'Algorithms', 'Arrays', 'Strings', 'Dynamic Programming', 'Trees', 'Graphs',
                'Bit Manipulation', 'Math', 'Greedy', 'Sorting', 'Hash Table', 'Two Pointers',
                'Stack', 'Heap', 'Recursion', 'Matrix', 'Sliding Window'
              ].map(tag => {
                const active = probTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (active) setProbTags(probTags.filter(t => t !== tag));
                      else setProbTags([...probTags, tag]);
                    }}
                    className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.8rem', borderRadius: '14px', padding: '0.25rem 0.75rem' }}
                  >
                    {tag} {active && <Check size={12} style={{ marginLeft: '4px' }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Allowed Languages Checkboxes */}
          <div className="form-group">
            <label className="form-label">Allowed Languages Subset</label>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
              {[
                { id: 'python', label: 'Python 3' },
                { id: 'cpp', label: 'C++ (g++)' },
                { id: 'c', label: 'C (gcc)' },
                { id: 'java', label: 'Java' },
                { id: 'javascript', label: 'JavaScript' }
              ].map(l => (
                <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={allowedLangs.includes(l.id)}
                    onChange={(e) => {
                      if (e.target.checked) setAllowedLangs([...allowedLangs, l.id]);
                      else setAllowedLangs(allowedLangs.filter(x => x !== l.id));
                    }}
                  />
                  {l.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: PROBLEM STATEMENT */}
      {wizardStep === 2 && (
        <div className="glass-card" style={{ padding: '1.8rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.2rem' }}>Section 2: Problem Statement, Formats & Constraints</h3>

          <div className="form-group" style={{ marginBottom: '1.2rem' }}>
            <label className="form-label">Description (Markdown & Rich Code Notation)</label>
            <textarea
              className="form-textarea"
              rows={8}
              placeholder="Write detailed problem statement... Markdown formatting, math bounds (1 ≤ N ≤ 10^5), and code snippets are fully supported."
              value={probDesc}
              onChange={(e) => setProbDesc(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
            <div className="form-group">
              <label className="form-label">Input Format</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="e.g. First line contains an integer N. Second line contains N space-separated integers."
                value={probInputFormat}
                onChange={(e) => setProbInputFormat(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Output Format</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="e.g. Print a single integer representing the maximum sum."
                value={probOutputFormat}
                onChange={(e) => setProbOutputFormat(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Constraints (Rendered in Monospace)</label>
            <textarea
              className="form-textarea font-mono"
              rows={4}
              placeholder="e.g. 1 <= N <= 10^5&#10;-10^9 <= A[i] <= 10^9"
              value={probConstraints}
              onChange={(e) => setProbConstraints(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* SECTION 3: TEST CASES MANAGER */}
      {wizardStep === 3 && (
        <div className="glass-card" style={{ padding: '1.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Section 3: Sample &amp; Hidden Test Cases</h3>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-slate)' }}>
                Public test cases are shown as visible samples. Hidden test cases are used exclusively for automated grading.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <FolderPlus size={14} /> Import File(s)
                <input
                  type="file"
                  multiple
                  accept=".txt,.in,.out,.ans,.json"
                  onChange={handleBatchFileImport}
                  style={{ display: 'none' }}
                />
              </label>
              <button type="button" className="btn btn-primary btn-sm" onClick={addTestCase}>
                <PlusCircle size={14} /> Add Test Case
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {testCases.map((tc, idx) => (
              <div key={idx} className="glass-panel" style={{ padding: '1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Test Case #{idx + 1}</span>
                    <span className={`badge ${tc.isHidden ? 'badge-wrong' : 'badge-easy'}`}>
                      {tc.isHidden ? 'Hidden (Grading)' : 'Public (Sample)'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <label style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={tc.isHidden}
                        onChange={(e) => updateTestCase(idx, 'isHidden', e.target.checked)}
                      />
                      Mark as Hidden
                    </label>
                    {testCases.length > 1 && (
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => removeTestCase(idx)}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.8rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-slate)', fontWeight: 600 }}>Input (stdin)</span>
                      <label style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                        <Upload size={12} /> Load File
                        <input
                          type="file"
                          accept=".txt,.in,.out,.ans,.json"
                          onChange={(e) => handleSingleFileUpload(idx, 'input', e)}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                    <textarea
                      className="form-textarea font-mono"
                      rows={3}
                      value={tc.input}
                      onChange={(e) => updateTestCase(idx, 'input', e.target.value)}
                      placeholder="Input data or click Load File..."
                      required
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-slate)', fontWeight: 600 }}>Expected Output (stdout)</span>
                      <label style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                        <Upload size={12} /> Load File
                        <input
                          type="file"
                          accept=".txt,.in,.out,.ans,.json"
                          onChange={(e) => handleSingleFileUpload(idx, 'expectedOutput', e)}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                    <textarea
                      className="form-textarea font-mono"
                      rows={3}
                      value={tc.expectedOutput}
                      onChange={(e) => updateTestCase(idx, 'expectedOutput', e.target.value)}
                      placeholder="Expected output or click Load File..."
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-slate)', marginBottom: '0.25rem' }}>Explanation / Notes (Shown on Sample)</div>
                    <textarea
                      rows={2}
                      className="form-textarea"
                      placeholder="e.g. Because 2 + 7 = 9, return indices [0, 1]. Press Enter for next line."
                      value={tc.explanation || ''}
                      onChange={(e) => updateTestCase(idx, 'explanation', e.target.value)}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-slate)', marginBottom: '0.25rem' }}>Marks Weight</div>
                    <input
                      type="number"
                      className="form-input"
                      min="0"
                      value={tc.marks !== undefined ? tc.marks : 10}
                      onChange={(e) => updateTestCase(idx, 'marks', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-slate)', marginBottom: '0.25rem' }}>Time Override (Sec)</div>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      placeholder="Default"
                      value={tc.timeLimitOverride || ''}
                      onChange={(e) => updateTestCase(idx, 'timeLimitOverride', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </div>
                </div>
              </div>
            ))}
            <div ref={testCasesEndRef} />
          </div>
        </div>
      )}

      {/* SECTION 4: STARTER CODE */}
      {wizardStep === 4 && (
        <div className="glass-card" style={{ padding: '1.8rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem' }}>Section 4: Starter Code Templates</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-slate)', marginBottom: '1.2rem' }}>
            Provide boilerplate code (e.g. stdin reading & solve function signature) pre-loaded when students open Monaco Editor.
          </p>

          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem', background: 'var(--bg-paper)' }}>
            {allowedLangs.map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => setActiveCodeLang(lang)}
                style={{
                  padding: '0.65rem 1.2rem',
                  fontSize: '0.85rem',
                  fontWeight: activeCodeLang === lang ? 700 : 500,
                  color: activeCodeLang === lang ? 'var(--accent-blue)' : 'var(--text-slate)',
                  border: 'none',
                  background: activeCodeLang === lang ? 'var(--bg-surface)' : 'transparent',
                  borderBottom: activeCodeLang === lang ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {lang === 'cpp' ? 'C++' : lang === 'javascript' ? 'JavaScript' : lang}
              </button>
            ))}
          </div>

          <textarea
            className="form-textarea font-mono"
            rows={14}
            style={{ fontSize: '0.88rem', lineHeight: 1.5 }}
            placeholder={`Write starter code boilerplate for ${activeCodeLang}...`}
            value={starterCode[activeCodeLang] || ''}
            onChange={(e) => setStarterCode({ ...starterCode, [activeCodeLang]: e.target.value })}
          />
        </div>
      )}

      {/* SECTION 5: STUDENT PREVIEW & PUBLISH */}
      {wizardStep === 5 && (
        <div className="glass-card" style={{ padding: '1.8rem' }}>
          <div style={{ marginBottom: '1.2rem', padding: '0.8rem 1rem', background: 'rgba(46, 94, 255, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-blue)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--accent-blue)' }}>Student Workbench Live Preview</div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-slate)' }}>
              Verify how the problem appears to students before saving to MongoDB Atlas.
            </span>
          </div>

          {/* Student Facing Preview Box */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0 }}>{probTitle || 'Untitled Problem'}</h2>
              <span className={`badge ${probDiff === 'Easy' ? 'badge-easy' : probDiff === 'Medium' ? 'badge-medium' : 'badge-hard'}`}>
                {probDiff}
              </span>
              <span className="badge badge-passed">{probPoints} pts</span>
            </div>

            {/* Tags */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
              {probTags.map(t => (
                <span key={t} style={{ background: 'var(--bg-paper)', border: '1px solid var(--border-color)', fontSize: '0.78rem', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                  {t}
                </span>
              ))}
            </div>

            <p style={{ color: 'var(--text-slate)', lineHeight: 1.6, marginBottom: '1.2rem', whiteSpace: 'pre-line' }}>
              {probDesc || 'No description provided.'}
            </p>

            {probInputFormat && (
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.3rem' }}>Input Format</h4>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-slate)' }}>{probInputFormat}</div>
              </div>
            )}

            {probOutputFormat && (
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.3rem' }}>Output Format</h4>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-slate)' }}>{probOutputFormat}</div>
              </div>
            )}

            {probConstraints && (
              <div style={{ marginBottom: '1.2rem' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.3rem' }}>Constraints</h4>
                <pre className="font-mono" style={{ background: 'var(--bg-paper)', padding: '0.65rem 0.85rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                  {probConstraints}
                </pre>
              </div>
            )}

            {/* Public Samples */}
            <div>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Sample Test Cases (Public)</h4>
              {testCases.filter(tc => !tc.isHidden).map((tc, idx) => (
                <div key={idx} style={{ background: 'var(--bg-paper)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.8rem', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                  <div><strong>Input:</strong> <code className="font-mono">{tc.input}</code></div>
                  <div style={{ marginTop: '0.2rem' }}><strong>Output:</strong> <code className="font-mono">{tc.expectedOutput}</code></div>
                  {tc.explanation && <div style={{ fontSize: '0.8rem', color: 'var(--text-slate)', marginTop: '0.3rem' }}><em>Explanation: {tc.explanation}</em></div>}
                </div>
              ))}
            </div>
          </div>

          {/* Validation Feedback Banner */}
          {validationError && (
            <div style={{ background: 'rgba(255,82,82,0.1)', border: '1px solid #ff5252', color: '#ff5252', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.2rem', fontSize: '0.88rem' }}>
              <AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
              <strong>Validation Alert:</strong> {validationError}
            </div>
          )}

          {validationReport && (
            <div style={{ background: 'rgba(0, 200, 83, 0.1)', border: '1px solid #00c853', color: '#00c853', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.2rem', fontSize: '0.88rem' }}>
              <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
              ✓ {validationReport.message || 'Problem saved successfully!'}
            </div>
          )}
        </div>
      )}

      {/* Page Footer Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.8rem' }}>
        <div>
          {wizardStep > 1 && (
            <button className="btn btn-secondary" onClick={() => setWizardStep(wizardStep - 1)}>
              ← Previous Section
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          {wizardStep < 5 ? (
            <button className="btn btn-primary" onClick={() => setWizardStep(wizardStep + 1)}>
              Next Section →
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleSaveProblem} disabled={validatingRef}>
              <Save size={16} /> {validatingRef ? 'Saving...' : 'Save & Publish Problem'}
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
