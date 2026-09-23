import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Editor from '@monaco-editor/react';
import api from '../services/api';

export const LandingPage = ({ setCurrentTab, landingSubTab, setLandingSubTab, setSelectedProblemSlug, onNavigatePortalTab }) => {
  const { user } = useAuth();
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactForm, setContactForm] = useState({ name: '', email: '', rollNo: '', subject: '', category: 'General Inquiry', message: '' });

  const activeTab = landingSubTab || 'home';
  const clubName = "Coders' Club";

  const sampleCode = `// Example Submission Preview - CodeArena
import java.util.HashMap;
import java.util.Map;
import java.util.Arrays;

public class Solution {
    public static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int diff = target - nums[i];
            if (seen.containsKey(diff)) {
                return new int[] { seen.get(diff), i };
            }
            seen.put(nums[i], i);
        }
        return new int[] {};
    }

    public static void main(String[] args) {
        // Test evaluation
        System.out.println(Arrays.toString(twoSum(new int[]{2, 7, 11, 15}, 9))); // Output: [0, 1]
    }
}`;

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    
    try {
      setContactLoading(true);
      setContactError('');
      await api.post('/contact/submit', contactForm);
      setContactSubmitted(true);
      setContactForm({ name: '', email: '', rollNo: '', subject: '', category: 'General Inquiry', message: '' });
      setTimeout(() => {
        setContactSubmitted(false);
      }, 7000);
    } catch (err) {
      console.error('Contact submit error:', err);
      setContactError(err.response?.data?.message || 'Failed to submit contact message. Please try again.');
    } finally {
      setContactLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg-paper)', minHeight: '100vh', color: 'var(--text-ink)' }}>

      {/* -------------------- HOME TAB -------------------- */}
      {activeTab === 'home' && (
        <div className="container" style={{ padding: '2.5rem 1rem' }}>
          
          {/* Institution & Club Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
            <img
              src="/gprec_logo.png"
              alt="G. Pulla Reddy Engineering College Logo"
              style={{ height: '72px', width: 'auto', objectFit: 'contain' }}
            />
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-ink)', marginBottom: '0.2rem', lineHeight: 1.2 }}>
                G. Pulla Reddy Engineering College
              </div>
              <div style={{ fontSize: '0.95rem', color: 'var(--text-slate)', fontWeight: 600 }}>
                Organized by {clubName}
              </div>
            </div>
          </div>




          {/* Hero CTA & Real Monaco Code Editor Preview (Light Theme) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.1fr',
            gap: '2rem',
            alignItems: 'center',
            marginBottom: '3rem'
          }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '1rem', lineHeight: 1.25 }}>
                Automated Assessment &amp; Competitive Programming Platform
              </h1>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-slate)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                High-concurrency code execution sandbox supporting Python, Java, C, C++, and JavaScript with automated test evaluation and real-time proctoring.
              </p>
              
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    if (onNavigatePortalTab) {
                      onNavigatePortalTab('dashboard');
                    } else if (user) {
                      setCurrentTab('dashboard');
                    } else {
                      setCurrentTab('auth');
                    }
                  }}
                  style={{ padding: '0.6rem 1.4rem', fontSize: '0.95rem' }}
                >
                  Get Started
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    const el = document.getElementById('specs-section');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      setLandingSubTab('about');
                    }
                  }}
                  style={{ padding: '0.6rem 1.2rem', fontSize: '0.95rem' }}
                >
                  Learn More
                </button>
              </div>
            </div>

            {/* Embedded Code Editor Preview (Light Theme vs) */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{
                background: 'var(--bg-paper)',
                padding: '0.5rem 1rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                color: 'var(--text-slate)',
                fontFamily: 'var(--font-mono)'
              }}>
                <span>Solution.java</span>
                <span>Java 17</span>
              </div>
              <div style={{ height: '260px' }}>
                <Editor
                  height="100%"
                  language="java"
                  theme="vs"
                  value={sampleCode}
                  options={{
                    readOnly: true,
                    fontSize: 13,
                    fontFamily: "'IBM Plex Mono', monospace",
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbersMinChars: 3,
                    domReadOnly: true,
                    renderLineHighlight: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Core Feature Highlights — Plain Bordered Table */}
          <div id="specs-section" style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem' }}>Platform Infrastructure Specs</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Feature</th>
                  <th style={{ width: '20%' }}>Spec</th>
                  <th>Technical Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600 }}>Auto-Evaluation</td>
                  <td><span className="font-mono">Sub-second</span></td>
                  <td>Strict output diff validation against public and hidden test fixtures.</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Multi-Language</td>
                  <td><span className="font-mono">5 Compilers</span></td>
                  <td>Sandboxed runtimes for Python 3, Java, C (gcc), C++ (g++), and Node.js.</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Anti-Cheat Proctoring</td>
                  <td><span className="font-mono">Event Hooks</span></td>
                  <td>Continuous tab blur tracking and window focus loss logging during contest mode.</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Concurrency Queueing</td>
                  <td><span className="font-mono">4-Worker Pool</span></td>
                  <td>Process-hardened execution semaphore preventing CPU exhaustion during submission spikes.</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* -------------------- ABOUT US TAB -------------------- */}
      {activeTab === 'about' && (
        <div className="container" style={{ maxWidth: '900px', padding: '2.5rem 1rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.4rem' }}>About GPREC &amp; {clubName}</h1>
            <p style={{ color: 'var(--text-slate)', fontSize: '0.95rem' }}>
              Empowering future engineers with world-class technical education and algorithmic coding mastery.
            </p>
          </div>

          {/* Institutional Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
            
            {/* GPREC Card */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <img
                  src="/gprec_logo.png"
                  alt="GPREC Logo"
                  style={{ height: '56px', width: 'auto', objectFit: 'contain' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-ink)' }}>G. Pulla Reddy Engineering College (Autonomous)</h3>
                    <span className="badge badge-blue">Est. 1984 • NAAC A+ Grade</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-slate)', fontWeight: 500, display: 'block', marginTop: '0.15rem' }}>Affiliated to JNTUA Anantapur • Kurnool, AP</span>
                </div>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-slate)', lineHeight: 1.65, marginBottom: '1rem' }}>
                G. Pulla Reddy Engineering College (GPREC) is a premier autonomous institution located in Kurnool, Andhra Pradesh, affiliated to Jawaharlal Nehru Technological University Anantapur (JNTUA). Founded in 1984 by the renowned philanthropist Sri G. Pulla Reddy, the institution has consistently maintained a reputation for academic excellence, state-of-the-art laboratory infrastructure, and cutting-edge research in computer science and engineering.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-slate)', textTransform: 'uppercase' }}>Accreditation</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>NAAC A+ &amp; NBA Accredited</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-slate)', textTransform: 'uppercase' }}>Affiliation</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>JNTUA Anantapur (Autonomous)</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-slate)', textTransform: 'uppercase' }}>Department</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Computer Science &amp; Engineering</div>
                </div>
              </div>
            </div>

            {/* Coders' Club Card */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <img
                  src="/coders_club_logo.png"
                  alt="Coders' Club Logo"
                  style={{ height: '52px', width: 'auto', objectFit: 'contain' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-ink)' }}>{clubName}</h3>
                    <span className="badge badge-easy">Student Technical Organization</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-slate)', fontWeight: 500, display: 'block', marginTop: '0.15rem' }}>Official Coding Community of GPREC</span>
                </div>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-slate)', lineHeight: 1.65, marginBottom: '1rem' }}>
                The <strong>{clubName}</strong> is the flagship technical community at GPREC, driven by students passionate about software engineering, competitive programming, and problem-solving. The club conducts regular hands-on workshops, algorithmic hackathons, coding assessments, and peer-to-peer mentoring sessions to prepare students for global coding competitions (ICPC, LeetCode Weekly, CodeChef Long Challenges) and top tier product company recruitments.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-slate)', textTransform: 'uppercase' }}>Active Coders</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>500+ Registered Students</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-slate)', textTransform: 'uppercase' }}>Focus Areas</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>DSA, CP, System Design</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-slate)', textTransform: 'uppercase' }}>Events</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Weekly Contests &amp; Hackathons</div>
                </div>
              </div>
            </div>

            {/* CodeArena Platform Vision */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <img
                  src="/coders_club_logo.png"
                  alt="CodeArena Logo"
                  style={{ height: '44px', width: 'auto', objectFit: 'contain' }}
                />
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-ink)' }}>Platform Architecture &amp; Mission</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-slate)', fontWeight: 500 }}>CodeArena Enterprise In-House Sandbox</span>
                </div>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-slate)', lineHeight: 1.65, margin: 0 }}>
                <strong>CodeArena</strong> was developed to provide GPREC students with an enterprise-grade, in-house assessment environment. By combining sub-second automated test evaluations, anti-cheat proctoring, multi-language sandbox execution, and live leaderboards, CodeArena provides a seamless platform for both practice and institutional coding examinations.
              </p>
            </div>


          </div>
        </div>
      )}

      {/* -------------------- RULES TAB -------------------- */}
      {activeTab === 'rules' && (
        <div className="container" style={{ maxWidth: '900px', padding: '2.5rem 1rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.4rem' }}>Assessment &amp; Contest Rules</h1>
            <p style={{ color: 'var(--text-slate)', fontSize: '0.95rem' }}>
              Detailed guidelines governing code submission, evaluation limits, and proctoring conduct.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Section I */}
            <div className="card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '0.6rem' }}>
                I. Standard Input &amp; Output Format
              </h3>
              <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-slate)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                <li>Submissions must read input exclusively from standard input (<code className="font-mono">stdin</code>) and write output to standard output (<code className="font-mono">stdout</code>).</li>
                <li>Do not print extra prompt strings (e.g. <code className="font-mono">"Enter number: "</code>), or write to files. Output must match test cases exactly character-by-character.</li>
                <li>Whitespace and line breaks are strictly evaluated unless specified otherwise by the problem description.</li>
              </ul>
            </div>

            {/* Section II */}
            <div className="card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '0.6rem' }}>
                II. Execution Time &amp; Memory Limits
              </h3>
              <table className="data-table" style={{ marginBottom: '0.75rem' }}>
                <thead>
                  <tr>
                    <th>Language Runtime</th>
                    <th>Time Limit</th>
                    <th>Memory Limit</th>
                    <th>Compiler Flags / Environment</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>C (GCC)</td>
                    <td className="font-mono">1.0 Second</td>
                    <td className="font-mono">256 MB</td>
                    <td className="font-mono">gcc -O2 -std=c11</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>C++ (G++)</td>
                    <td className="font-mono">1.0 Second</td>
                    <td className="font-mono">256 MB</td>
                    <td className="font-mono">g++ -O2 -std=c++17</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Java (OpenJDK)</td>
                    <td className="font-mono">1.5 Seconds</td>
                    <td className="font-mono">256 MB</td>
                    <td className="font-mono">javac 17 (Solution.java)</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Python 3</td>
                    <td className="font-mono">2.0 Seconds</td>
                    <td className="font-mono">256 MB</td>
                    <td className="font-mono">python 3.10.x</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>JavaScript (Node)</td>
                    <td className="font-mono">2.0 Seconds</td>
                    <td className="font-mono">256 MB</td>
                    <td className="font-mono">node.js v18.x</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section III */}
            <div className="card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '0.6rem' }}>
                III. Contest Scoring &amp; Penalties
              </h3>
              <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-slate)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                <li><strong>Accepted (AC)</strong>: Submissions that pass all public and hidden evaluation test cases receive full points.</li>
                <li><strong>Penalty Rules</strong>: In official timed contests, a +10 minute time penalty is added for each rejected submission (<code className="font-mono">WA</code>, <code className="font-mono">TLE</code>, <code className="font-mono">RE</code>) before achieving an Accepted verdict.</li>
                <li><strong>Tie-Breaking</strong>: Ranking on the leaderboard is ordered first by Total Score (descending), and second by Total Elapsed Time + Penalties (ascending).</li>
              </ul>
            </div>

            {/* Section IV */}
            <div className="card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--diff-hard)', marginBottom: '0.6rem' }}>
                IV. Anti-Cheat Proctoring &amp; Academic Integrity
              </h3>
              <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-slate)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                <li><strong>Tab Switching Log</strong>: Active contest mode logs every window blur and tab focus loss. Exceeding the maximum allowed tab switch limit triggers automatic submission lock.</li>
                <li><strong>Plagiarism Audit</strong>: All submitted source codes are automatically analyzed using AST similarity detection software post-contest.</li>
                <li><strong>Zero Tolerance</strong>: Sharing code via external chat apps, forums, or secondary devices during an active contest will result in immediate disqualification and reporting to department faculty.</li>
              </ul>
            </div>

          </div>
        </div>
      )}

      {/* -------------------- TERMS & CONDITIONS TAB -------------------- */}
      {activeTab === 'terms' && (
        <div className="container" style={{ maxWidth: '900px', padding: '2.5rem 1rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.4rem' }}>Terms &amp; Conditions of Use</h1>
            <p style={{ color: 'var(--text-slate)', fontSize: '0.95rem' }}>
              Legal policies, security requirements, and administrative rights governing CodeArena.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div className="card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.4rem' }}>1. Acceptance of Terms</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-slate)', lineHeight: 1.6 }}>
                By accessing or registering an account on CodeArena (maintained by G. Pulla Reddy Engineering College and Coders' Club), users agree to comply with all platform operational rules, proctoring requirements, and code of conduct policies.
              </p>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.4rem' }}>2. Account Security &amp; Credentials</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-slate)', lineHeight: 1.6 }}>
                Users are strictly responsible for maintaining the confidentiality of their login credentials (college roll number / email). Account sharing, selling, or submitting code on behalf of another student is strictly prohibited and constitutes an academic violation.
              </p>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.4rem' }}>3. Sandbox Integrity &amp; System Exploits</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-slate)', lineHeight: 1.6, marginBottom: '0.5rem' }}>
                All user code is executed in isolated container sandboxes. Attempting any of the following malicious activities will result in immediate permanent account termination and legal/academic escalation:
              </p>
              <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-slate)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                <li>Executing system calls to probe host file structures or network interfaces.</li>
                <li>Launching fork bombs, infinite memory allocation loops, or privilege escalation exploits.</li>
                <li>Attempting to intercept or tamper with backend API requests or database contents.</li>
              </ul>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.4rem' }}>4. Intellectual Property &amp; Code Usage Rights</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-slate)', lineHeight: 1.6 }}>
                Problem statements, test cases, and platform assets are the intellectual property of GPREC and Coders' Club. Students retain copyright of their written solutions, but grant CodeArena non-exclusive royalty-free rights to store, execute, grade, and audit submissions for plagiarism detection.
              </p>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.4rem' }}>5. Administrative Discretion &amp; Disqualification</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-slate)', lineHeight: 1.6 }}>
                Contest administrators and department faculty reserve the right to void scores, disqualify contestants, or alter problem test cases in the event of technical issues, proctoring infractions, or compromised test integrity.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* -------------------- FAQS TAB -------------------- */}
      {activeTab === 'faqs' && (
        <div className="container" style={{ maxWidth: '850px', padding: '2.5rem 1rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.4rem' }}>Frequently Asked Questions</h1>
            <p style={{ color: 'var(--text-slate)', fontSize: '0.95rem' }}>
              Answers to technical queries regarding runtimes, test evaluations, and proctoring.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {[
              { q: "Which programming languages can I use on CodeArena?", a: "CodeArena supports Python 3.10, Java 17 (OpenJDK), C (GCC 11), C++17 (G++ 11), and JavaScript (Node.js v18)." },
              { q: "How are submissions evaluated?", a: "Submissions are compiled and executed inside isolated worker sandboxes against public test cases for immediate feedback, and hidden test cases for final scoring." },
              { q: "What does 'Time Limit Exceeded (TLE)' mean?", a: "Your solution exceeded the allowed execution time limit (e.g. 1.0s for C/C++ or 2.0s for Python). Optimize your algorithm's time complexity." },
              { q: "How does anti-cheat proctoring function during contests?", a: "During live contests, CodeArena monitors browser visibility and window blur events. Switching tabs or opening external windows is logged as a proctor warning." },
              { q: "What happens during peak contest submission spikes?", a: "CodeArena features an in-memory execution queue semaphore that caps concurrent worker processes at 4, holding extra submissions safely until free slots open without dropping requests." },
              { q: "Who should I contact if I encounter a bug in a problem statement?", a: "Use the Contact Us tab to submit a inquiry directly to the Coders' Club technical team or problem authors." }
            ].map((item, idx) => (
              <div key={idx} className="card">
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--accent-blue)', marginBottom: '0.35rem' }}>{item.q}</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-slate)', lineHeight: 1.6 }}>{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------- CONTACT US TAB -------------------- */}
      {activeTab === 'contact' && (
        <div className="container" style={{ maxWidth: '950px', padding: '2.5rem 1rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.4rem' }}>Contact &amp; Support</h1>
            <p style={{ color: 'var(--text-slate)', fontSize: '0.95rem' }}>
              Reach out to GPREC Coders' Club administrators for technical support or contest inquiries.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '2rem', alignItems: 'start' }}>
            
            {/* Contact Details & Location Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div className="card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Campus Address</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-slate)', lineHeight: 1.6, marginBottom: '0.5rem' }}>
                  <strong>G. Pulla Reddy Engineering College (Autonomous)</strong><br />
                  G.P.R. Town, Kurnool - 518007<br />
                  Andhra Pradesh, India
                </p>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-slate)' }}>
                  Department: CSE(AI&amp;ML)
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{clubName} Helpdesk</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-slate)' }}>Email:</span>{' '}
                    <span className="font-mono" style={{ fontWeight: 600 }}>codersclub@gprec.ac.in</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-slate)' }}>Office Hours:</span>{' '}
                    <span>Mon - Sat (9:00 AM - 5:00 PM IST)</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-slate)' }}>Platform Lead:</span>{' '}
                    <span>Coders' Club Technical Team</span>
                  </div>
                </div>
              </div>

              <div className="card" style={{ background: 'var(--accent-blue-light)', borderColor: 'var(--accent-blue)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '0.25rem' }}>Quick Support Tip</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-ink)', lineHeight: 1.5 }}>
                  For urgent contest issues, include your Roll Number, Problem Slug, and exact submission error in your message.
                </p>
              </div>
            </div>

            {/* Interactive Support Form Column */}
            <div className="card">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem' }}>Send Us a Message</h3>

              {contactSubmitted ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', background: '#DCFCE7', borderRadius: 'var(--radius-sm)', border: '1px solid #86EFAC' }}>
                  <h3 style={{ fontSize: '1.15rem', color: '#166534', marginBottom: '0.4rem', fontWeight: 600 }}>Message Sent Successfully!</h3>
                  <p style={{ fontSize: '0.88rem', color: '#14532D' }}>
                    Thank you for reaching out. The technical team has received your message via email and will respond shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit}>
                  {contactError && (
                    <div style={{ padding: '0.75rem 1rem', background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600 }}>
                      ⚠️ {contactError}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: '0.3rem' }}>Full Name *</label>
                      <input type="text" className="form-input" placeholder="Your full name" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} required />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: '0.3rem' }}>Email Address *</label>
                      <input type="email" className="form-input" placeholder="Your email address" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} required />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: '0.3rem' }}>Roll Number / ID</label>
                      <input type="text" className="form-input" placeholder="e.g. 219X1A05XX" value={contactForm.rollNo} onChange={(e) => setContactForm({ ...contactForm, rollNo: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: '0.3rem' }}>Inquiry Category</label>
                      <select className="form-select" value={contactForm.category} onChange={(e) => setContactForm({ ...contactForm, category: e.target.value })}>
                        <option value="General Inquiry">General Inquiry</option>
                        <option value="Contest Issues">Contest / Proctoring Issue</option>
                        <option value="Problem Bug">Problem Testcase Bug</option>
                        <option value="Account Access">Account / Login Access</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: '0.3rem' }}>Subject</label>
                    <input type="text" className="form-input" placeholder="Brief subject" value={contactForm.subject} onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })} />
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: '0.3rem' }}>Message Details *</label>
                    <textarea className="form-textarea" placeholder="Describe your question or issue in detail..." rows={4} value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} required />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.65rem' }} disabled={contactLoading}>
                    {contactLoading ? 'Sending Email via SMTP...' : 'Submit Message'}
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
