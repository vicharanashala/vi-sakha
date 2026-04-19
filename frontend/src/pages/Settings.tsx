import { useState } from 'react';
import { Key, Copy, Check, AlertCircle, RefreshCw, User, Mail, Shield, ArrowLeft, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUser, clearAuth, getToken } from '@/lib/auth';

export default function Settings() {
  const navigate = useNavigate();
  const authUser = getUser();
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentlyGeneratedKey, setRecentlyGeneratedKey] = useState<string | null>(null);

  const fetchApiKeys = async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/auth/api-keys', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) setApiKeys(data);
    } catch (err) {
      console.error('Failed to fetch API keys', err);
    }
  };

  useState(() => {
    fetchApiKeys();
  });

  const generateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch('/api/auth/api-keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newKeyName })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to generate API key');
      
      setRecentlyGeneratedKey(data.apiKey);
      setNewKeyName('');
      fetchApiKeys();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteApiKey = async (id: string) => {
    if (!window.confirm("Are you sure you want to revoke this API key? This action is permanent.")) return;
    
    try {
      const token = getToken();
      const response = await fetch(`/api/auth/api-keys/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchApiKeys();
        if (recentlyGeneratedKey) setRecentlyGeneratedKey(null);
      }
    } catch (err) {
      console.error('Failed to delete key', err);
    }
  };

  const copyToClipboard = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-start p-8 font-['Inter']">
      <div className="max-w-3xl w-full">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-500 hover:text-gray-900 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Dashboard</span>
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600 mb-8">Manage your account and developer access integrations.</p>

        <div className="space-y-6">
          {/* Account Profile Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E8DFD3] overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-900 text-white rounded-lg">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Account Profile</h2>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Your personal identity on Vi-Sakha</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Full Name</label>
                  <div className="flex items-center space-x-2 text-gray-900">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-semibold">{authUser?.name || '—'}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email Address</label>
                  <div className="flex items-center space-x-2 text-gray-900">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-semibold">{authUser?.email || '—'}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Platform Role</label>
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full capitalize border border-emerald-100">
                      {authUser?.role || '—'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => { clearAuth(); navigate('/login') }}
                  className="flex items-center space-x-2 text-sm text-red-600 hover:text-red-700 font-bold transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* API Key Section - Restricted to Admin/LabMember */}
          {(authUser?.role === 'admin' || authUser?.role === 'lab_member') && (
            <div className="bg-white rounded-2xl shadow-sm border border-[#E8DFD3] overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-600 text-white rounded-lg">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900">Developer API Access</h2>
                      <button 
                        onClick={() => navigate('/api-docs')}
                        className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full hover:bg-blue-100 transition-colors uppercase tracking-wider border border-blue-100"
                      >
                        API Docs
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Manage your programmatic access keys</p>
                  </div>
                </div>
              </div>
            
            <div className="p-6 space-y-6">
              {/* Recently Generated Key Toast-like Notice */}
              {recentlyGeneratedKey && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-start space-x-3">
                    <Check className="w-5 h-5 text-emerald-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-emerald-900">Key Generated Successfully</h4>
                      <p className="text-xs text-emerald-800 mt-1 font-medium italic">
                        Please copy this key now. It is stored encrypted, but for security, it won't be shown in plain text again after you leave this page.
                      </p>
                      <div className="mt-3 flex items-center space-x-2">
                        <code className="flex-1 bg-white border border-emerald-100 rounded-lg px-3 py-2 text-xs font-mono text-emerald-900 shadow-sm overflow-x-auto">
                          {recentlyGeneratedKey}
                        </code>
                        <button
                          onClick={() => copyToClipboard(recentlyGeneratedKey, 'recent')}
                          className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                          title="Copy Key"
                        >
                          {copiedId === 'recent' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Generate New Key Form */}
              <form onSubmit={generateApiKey} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Key Name (e.g., Development Bot)"
                    className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !newKeyName.trim()}
                  className="h-11 flex items-center justify-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-6 rounded-xl font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  <span>Generate Key</span>
                </button>
              </form>

              {/* API Keys Table */}
              <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Name</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Prefix</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expires In</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {apiKeys.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm font-medium">
                          No active API keys found.
                        </td>
                      </tr>
                    ) : (
                      apiKeys.map((key) => {
                        const daysLeft = Math.max(0, Math.ceil((new Date(key.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
                        return (
                          <tr key={key.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="px-5 py-4">
                              <div className="text-sm font-bold text-gray-900">{key.name}</div>
                              <div className="text-[10px] text-gray-400 font-medium">Created {new Date(key.createdAt).toLocaleDateString()}</div>
                            </td>
                            <td className="px-5 py-4">
                              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono">
                                vsakha_...{key.last4}
                              </code>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${daysLeft > 7 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                {daysLeft} Days
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => copyToClipboard(key.key, key.id)}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  title="Copy Original Key"
                                >
                                  {copiedId === key.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => deleteApiKey(key.id)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Revoke Key"
                                >
                                  <AlertCircle className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {error && (
                <div className="mt-4 text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 font-medium">
                  Error: {error}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
