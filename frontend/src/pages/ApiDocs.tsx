import React, { useState } from 'react';
import { 
  ArrowLeft, 
  BookOpen, 
  Code, 
  ShieldCheck, 
  MessageSquare, 
  Search, 
  Copy, 
  Check, 
  ExternalLink,
  ChevronRight,
  Terminal,
  Cpu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_REFERENCE = [
  {
    category: 'Core Services',
    routes: [
      {
        id: 'chat',
        name: 'AI Chat Core',
        method: 'POST',
        path: '/api/chat/message',
        description: 'Send a message to the GenAI engine for immediate semantic response processing.',
        params: [
          { name: 'content', type: 'string', required: true, desc: 'The message text to process.' },
          { name: 'conversationId', type: 'string', required: false, desc: 'Existing thread target ID.' }
        ],
        code: {
          curl: `curl -X POST https://api.vi-sakha.com/api/chat/message \\
  -H "X-API-KEY: your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "How do I reset my password?"}'`,
          javascript: `const response = await fetch('https://api.vi-sakha.com/api/chat/message', {
  method: 'POST',
  headers: {
    'X-API-KEY': 'your_api_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ content: "How do I reset my password?" })
});
const data = await response.json();`
        }
      },
      {
        id: 'search',
        name: 'Knowledge Lookup',
        method: 'GET',
        path: '/api/qa-pairs/search',
        description: 'Query the semantic knowledge base for exact and related matches.',
        params: [
          { name: 'q', type: 'string', required: true, desc: 'The semantic query string.' },
          { name: 'limit', type: 'number', required: false, desc: 'Max nodes to return (default: 5).' }
        ],
        code: {
          curl: `curl "https://api.vi-sakha.com/api/qa-pairs/search?q=internship+policies" \\
  -H "X-API-KEY: your_api_key_here"`,
          javascript: `const url = new URL('https://api.vi-sakha.com/api/qa-pairs/search');
url.searchParams.append('q', 'internship policies');

const response = await fetch(url, {
  headers: { 'X-API-KEY': 'your_api_key_here' }
});
const knowledge = await response.json();`
        }
      }
    ]
  }
];

export default function ApiDocs() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'curl' | 'javascript'>('curl');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-start p-8 font-['Inter']">
      <div className="max-w-4xl w-full">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => navigate('/dashboard/settings')}
            className="flex items-center text-gray-500 hover:text-gray-900 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Settings</span>
          </button>
          
          <div className="flex items-center space-x-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
            <Cpu className="w-3.5 h-3.5" />
            <span>API Version 1.0.0-PRO</span>
          </div>
        </div>

        {/* Header Section */}
        <div className="mb-12">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">API Reference</h1>
              <p className="text-gray-500 font-medium">Build custom programmatic integrations with the Vi-Sakha GenAI engine</p>
            </div>
          </div>
          
          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <div className="bg-white p-6 rounded-2xl border border-[#E8DFD3] shadow-sm">
              <div className="flex items-center space-x-3 mb-3 text-blue-600">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Authentication</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                All API requests require an <code className="bg-gray-100 px-1.5 py-0.5 rounded text-blue-700 font-mono">X-API-KEY</code> header. 
                You can generate and manage these keys in your <span className="underline decoration-blue-200 cursor-pointer hover:text-blue-600" onClick={() => navigate('/settings')}>settings</span>.
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#E8DFD3] shadow-sm">
              <div className="flex items-center space-x-3 mb-3 text-emerald-600">
                <Terminal className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Base URL</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed font-mono">
                https://api.vi-sakha.com
              </p>
              <p className="text-[10px] text-gray-400 mt-2 italic">Production environment endpoint</p>
            </div>
          </div>
        </div>

        {/* API Categories */}
        <div className="space-y-12">
          {API_REFERENCE.map((category) => (
            <div key={category.category}>
              <h2 className="text-xl font-extrabold text-gray-900 mb-6 flex items-center space-x-3 grayscale opacity-40">
                <ChevronRight className="w-5 h-5" />
                <span className="uppercase tracking-widest text-sm">{category.category}</span>
              </h2>
              
              <div className="space-y-8">
                {category.routes.map((route) => (
                  <div key={route.id} className="bg-white rounded-3xl border border-[#E8DFD3] shadow-xl overflow-hidden group hover:border-blue-200 transition-colors">
                    <div className="p-8">
                      {/* Route Identifier */}
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                             <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                               route.method === 'POST' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                             }`}>
                               {route.method}
                             </span>
                             <span className="text-sm font-mono text-gray-500">{route.path}</span>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-900">{route.name}</h3>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-blue-50 transition-colors">
                          {route.id === 'chat' ? <MessageSquare className="w-6 h-6 text-gray-400 group-hover:text-blue-500" /> : <Search className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />}
                        </div>
                      </div>

                      <p className="text-gray-600 mb-8 leading-relaxed max-w-2xl">{route.description}</p>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Parameters Table */}
                        <div>
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Request Parameters</h4>
                          <div className="space-y-4">
                            {route.params.map(param => (
                              <div key={param.name} className="flex items-start justify-between border-b border-gray-50 pb-3">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-bold text-gray-900">{param.name}</span>
                                    {param.required && <span className="text-[8px] font-black text-red-500 uppercase tracking-tight bg-red-50 px-1 rounded">Required</span>}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">{param.desc}</p>
                                </div>
                                <span className="text-[10px] font-mono text-gray-400">{param.type}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Code Snippets */}
                        <div className="relative">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Example Usage</h4>
                            <div className="flex bg-gray-100 p-0.5 rounded-lg">
                              {(['curl', 'javascript'] as const).map(tab => (
                                <button
                                  key={tab}
                                  onClick={() => setActiveTab(tab)}
                                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase tracking-tighter ${
                                    activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                  }`}
                                >
                                  {tab}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          <div className="bg-gray-900 rounded-2xl p-5 shadow-2xl relative">
                            <button
                              onClick={() => copyToClipboard(route.code[activeTab], `${route.id}-${activeTab}`)}
                              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors"
                            >
                              {copiedId === `${route.id}-${activeTab}` ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <pre className="text-xs text-emerald-400 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                              {route.code[activeTab]}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-20 pt-10 border-t border-[#E8DFD3] flex flex-col md:flex-row items-center justify-between text-gray-400">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Code className="w-5 h-5" />
            <span className="text-sm font-bold tracking-tight">VIA-SAKHA DEVELOPER HUB</span>
          </div>
          <div className="flex items-center space-x-6 text-[10px] font-bold uppercase tracking-widest">
            <span className="hover:text-blue-500 cursor-pointer">Rate Limits</span>
            <span className="hover:text-blue-500 cursor-pointer">Webhooks</span>
            <span className="hover:text-blue-500 cursor-pointer flex items-center">
              System Status
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full ml-2 animate-pulse" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
