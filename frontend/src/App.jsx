import { useState, useEffect } from 'react';
import api from './api';
import {
  Upload, Briefcase, CheckCircle, XCircle, LogOut, Plus,
  ArrowRight, Sparkles, FileSearch, AlertTriangle, Check
} from 'lucide-react';

const STATUSES = ['WISHLIST', 'APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED'];
function getUserFromToken(token) {
  if (!token) return '';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || '';
  } catch {
    return '';
  }
}
export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const userEmail = getUserFromToken(token);
  const displayName = userEmail ? userEmail.split('@')[0] : '';
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Resume & Dashboard State
  const [skills, setSkills] = useState([]);
  const [resumeName, setResumeName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [matches, setMatches] = useState([]);
  const [applications, setApplications] = useState([]);
  const [activeTab, setActiveTab] = useState('role-suggester');

  // Feature 1: Describe Skills -> Role Suggester State
  const [skillPrompt, setSkillPrompt] = useState('');
  const [roleResults, setRoleResults] = useState(null);
  const [analyzingRoles, setAnalyzingRoles] = useState(false);

  // Feature 2: Live JD Matcher State
  const [jdTitle, setJdTitle] = useState('');
  const [jdCompany, setJdCompany] = useState('');
  const [jdText, setJdText] = useState('');
  const [jdAnalysis, setJdAnalysis] = useState(null);
  const [analyzingJd, setAnalyzingJd] = useState(false);

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const fetchDashboardData = async () => {
    try {
      const [resumeRes, matchRes, appRes] = await Promise.all([
        api.get('/resumes/latest'),
        api.get('/jobs/matched'),
        api.get('/applications'),
      ]);
      if (resumeRes.data) {
        setResumeName(resumeRes.data.filename);
        setSkills(resumeRes.data.skills || []);
      }
      setMatches(matchRes.data);
      setApplications(appRes.data);
    } catch (err) {
      if (err.response?.status === 401) handleLogout();
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegister) {
        await api.post('/auth/register', { email, password });
        setIsRegister(false);
        setAuthError('Registration successful! Please log in.');
      } else {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.access_token);
        setToken(res.data.access_token);
      }
    } catch (err) {
      setAuthError(err.response?.data?.detail || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setMatches([]);
    setApplications([]);
    setSkills([]);
    setResumeName('');
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/resumes/upload', formData);
      setSkills(res.data.skills);
      setResumeName(res.data.filename);
      await fetchDashboardData();
    } catch (err) {
      alert('Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  const handleSuggestRoles = async (e) => {
    e.preventDefault();
    if (!skillPrompt.trim()) return;
    setAnalyzingRoles(true);
    try {
      const res = await api.post('/roles/suggest', { description: skillPrompt });
      setRoleResults(res.data);
    } catch (err) {
      alert('Could not analyze skills');
    } finally {
      setAnalyzingRoles(false);
    }
  };

  const handleAnalyzeJD = async (saveToBoard = false) => {
    if (!jdTitle.trim() || !jdCompany.trim() || !jdText.trim()) {
      alert('Please fill in Role Title, Company Name, and Job Description.');
      return;
    }
    setAnalyzingJd(true);
    try {
      const res = await api.post('/jobs/analyze-jd', {
        job_title: jdTitle,
        company: jdCompany,
        job_description: jdText,
        save_to_board: saveToBoard,
      });
      setJdAnalysis(res.data);
      if (saveToBoard) {
        await fetchDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Error analyzing job description');
    } finally {
      setAnalyzingJd(false);
    }
  };

  const handleTrackJob = async (jobId) => {
    try {
      await api.post(`/applications?job_id=${jobId}`);
      await fetchDashboardData();
      setActiveTab('tracker');
    } catch (err) {
      alert(err.response?.data?.detail || 'Already tracking this job');
    }
  };

  const handleStatusChange = async (appId, newStatus) => {
    try {
      await api.patch(`/applications/${appId}/status`, { status: newStatus });
      setApplications((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app))
      );
    } catch (err) {
      alert('Failed to update status');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-xl">
          <h1 className="text-2xl font-bold text-white mb-1">MatchPoint</h1>
          <p className="text-slate-400 text-sm mb-6">AI Career Intelligence & Pipeline Engine</p>
          {authError && (
            <div className="mb-4 p-3 rounded-lg bg-indigo-950 border border-indigo-700 text-indigo-200 text-sm">
              {authError}
            </div>
          )}
          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="email"
              placeholder="Email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
            />
            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition cursor-pointer"
            >
              {isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="mt-4 text-sm text-slate-400 hover:text-white w-full text-center cursor-pointer"
          >
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 font-bold text-lg text-white leading-tight">
              <Briefcase className="w-5 h-5 text-indigo-400" />
              <span>MatchPoint</span>
            </div>
            {userEmail && (
              <span className="text-[11px] text-slate-400 pl-7 truncate max-w-[200px]" title={userEmail}>
                Welcome, {displayName}
              </span>
            )}
          </div>
          <nav className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('role-suggester')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition ${
                activeTab === 'role-suggester' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" /> Skill → Role Finder
            </button>
            <button
              onClick={() => setActiveTab('jd-matcher')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition ${
                activeTab === 'jd-matcher' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSearch className="w-4 h-4" /> Live JD Matcher
            </button>
            <button
              onClick={() => setActiveTab('matches')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition ${
                activeTab === 'matches' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Saved Jobs ({matches.length})
            </button>
            <button
              onClick={() => setActiveTab('tracker')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition ${
                activeTab === 'tracker' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pipeline ({applications.length})
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-rose-400 ml-3 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Persistent Resume Vector Engine Banner */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Resume Vector Engine</h2>
            <p className="text-sm text-slate-400 mt-1">
              {resumeName
                ? `Active Resume: ${resumeName}`
                : 'Upload your PDF resume once to power Live JD Matching and Semantic Job Ranking.'}
            </p>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-0.5 text-xs font-medium rounded-md bg-indigo-950 text-indigo-300 border border-indigo-800"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm cursor-pointer shrink-0 transition">
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Indexing Vector...' : resumeName ? 'Update PDF Resume' : 'Upload PDF Resume'}</span>
            <input type="file" accept=".pdf" onChange={handleResumeUpload} className="hidden" />
          </label>
        </section>

        {/* FEATURE 1: DESCRIBE SKILLS -> ROLE SUGGESTER & MISSING SKILLS */}
        {activeTab === 'role-suggester' && (
          <section className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-semibold text-white">Describe Your Skills & Projects</h2>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Tell the model what languages, frameworks, and tools you know. It will compute semantic fit across industry roles and highlight the exact missing skills you need to target each role.
              </p>
              <form onSubmit={handleSuggestRoles} className="space-y-4">
                <textarea
                  rows={3}
                  placeholder="Example: I am a 2026 CSE graduate proficient in Python, FastAPI, PostgreSQL, AsyncPG, SQL, and Git. I built an MCP server and have basic AWS and Docker knowledge..."
                  value={skillPrompt}
                  onChange={(e) => setSkillPrompt(e.target.value)}
                  className="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
                <div className="flex items-center justify-between">
                  {skills.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSkillPrompt(`I am skilled in ${skills.join(', ')}.`)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
                    >
                      + Auto-fill from my uploaded resume
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={analyzingRoles}
                    className="ml-auto flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm cursor-pointer transition"
                  >
                    <Sparkles className="w-4 h-4" />
                    {analyzingRoles ? 'Analyzing Career Fit...' : 'Suggest Best Roles'}
                  </button>
                </div>
              </form>
            </div>

            {roleResults && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roleResults.roles.map((item) => (
                  <div
                    key={item.role}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-white text-lg">{item.role}</h3>
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-700 shrink-0">
                          {item.fit_score}% Fit
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">{item.summary}</p>

                      <div className="mt-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 mb-1.5">
                          Your Matching Skills
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.matched_skills.length > 0 ? (
                            item.matched_skills.map((s) => (
                              <span
                                key={s}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-950/70 text-emerald-300 border border-emerald-800/60"
                              >
                                <CheckCircle className="w-3 h-3" /> {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500">None detected yet</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 mb-1.5 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Missed Skills to Learn
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.missing_skills.length > 0 ? (
                            item.missing_skills.map((s) => (
                              <span
                                key={s}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-950/60 text-amber-300 border border-amber-700/60 font-medium"
                              >
                                + {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-emerald-400">All core skills covered!</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* FEATURE 2: REAL-TIME RESUME VS JOB DESCRIPTION MATCHER */}
        {activeTab === 'jd-matcher' && (
          <section className="grid lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-semibold text-white">Live Job Description Matcher</h2>
              </div>
              <p className="text-sm text-slate-400">
                Paste any live job posting from LinkedIn, Naukri, or Wellfound to calculate your ATS vector score and missing keywords against your uploaded resume.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Role Title (e.g. Python Developer)"
                  value={jdTitle}
                  onChange={(e) => setJdTitle(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Company (e.g. Razorpay)"
                  value={jdCompany}
                  onChange={(e) => setJdCompany(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <textarea
                rows={7}
                placeholder="Paste the full job requirements and responsibilities here..."
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                className="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={analyzingJd}
                  onClick={() => handleAnalyzeJD(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium cursor-pointer transition"
                >
                  {analyzingJd ? 'Comparing Vectors...' : 'Compare Resume vs JD'}
                </button>
                <button
                  type="button"
                  disabled={analyzingJd}
                  onClick={() => handleAnalyzeJD(true)}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Plus className="w-4 h-4" /> Match & Save to Tracker
                </button>
              </div>
            </div>

            {/* Analysis Output Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              {!jdAnalysis ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
                  <FileSearch className="w-10 h-10 mb-3 text-slate-600" />
                  <p className="text-sm">Paste a job description on the left and click Compare to see your ATS breakdown.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white">{jdAnalysis.job_title}</h3>
                      <p className="text-sm text-indigo-400">{jdAnalysis.company}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1.5 rounded-full text-sm font-bold bg-emerald-950 text-emerald-400 border border-emerald-700">
                        {jdAnalysis.ats_score}% Overall Match
                      </span>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Semantic Vector Score: {jdAnalysis.semantic_similarity}%
                      </p>
                    </div>
                  </div>

                  {jdAnalysis.saved_to_tracker && (
                    <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                      <Check className="w-4 h-4" /> Saved to your database and added to Wishlist in Pipeline Tracker!
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                      Matched Skills ({jdAnalysis.matched_skills.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {jdAnalysis.matched_skills.length > 0 ? (
                        jdAnalysis.matched_skills.map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-emerald-950/80 text-emerald-300 border border-emerald-800"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">No direct keyword overlap detected.</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2">
                      Missing Keywords from JD ({jdAnalysis.missing_skills.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {jdAnalysis.missing_skills.length > 0 ? (
                        jdAnalysis.missing_skills.map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-rose-950/80 text-rose-300 border border-rose-800"
                          >
                            <XCircle className="w-3.5 h-3.5" /> {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-emerald-400">Your resume hits every extracted skill in this JD!</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 3: SAVED JOBS RANKED BY PGVECTOR */}
        {activeTab === 'matches' && (
          <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800">
                Upload a PDF resume above to rank saved jobs.
              </div>
            ) : (
              matches.map((job) => (
                <div
                  key={job.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-white text-lg">{job.title}</h3>
                        <p className="text-sm text-indigo-400 font-medium">{job.company}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {job.match_score}% Match
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-3 line-clamp-3">{job.description}</p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {job.matched_skills.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-950/70 text-emerald-300 border border-emerald-800/60"
                        >
                          <CheckCircle className="w-3 h-3" /> {s}
                        </span>
                      ))}
                      {job.missing_skills.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-rose-950/70 text-rose-300 border border-rose-800/60"
                        >
                          <XCircle className="w-3 h-3" /> {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleTrackJob(job.id)}
                    className="mt-6 w-full py-2 rounded-lg bg-slate-800 hover:bg-indigo-600 text-sm font-medium text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add to Pipeline
                  </button>
                </div>
              ))
            )}
          </section>
        )}

        {/* TAB 4: APPLICATION PIPELINE BOARD */}
        {activeTab === 'tracker' && (
          <section className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {STATUSES.map((status) => {
              const columnApps = applications.filter((a) => a.status === status);
              return (
                <div
                  key={status}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 min-h-[400px]"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold tracking-wider text-slate-400">{status}</h3>
                    <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                      {columnApps.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {columnApps.map((app) => (
                      <div
                        key={app.id}
                        className="bg-slate-800/90 border border-slate-700 rounded-lg p-3.5 shadow-sm"
                      >
                        <h4 className="font-medium text-sm text-white">{app.title}</h4>
                        <p className="text-xs text-indigo-400 mt-0.5">{app.company}</p>
                        <div className="mt-3 pt-2 border-t border-slate-700/70 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            Move <ArrowRight className="w-3 h-3" />
                          </span>
                          <select
                            value={app.status}
                            onChange={(e) => handleStatusChange(app.id, e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-xs rounded px-2 py-1 text-slate-200 focus:outline-none"
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}