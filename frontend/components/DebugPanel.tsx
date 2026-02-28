// components/DebugPanel.tsx
// API日志调试面板

import React, { useState, useEffect } from 'react';
import { X, Download, Trash2, RefreshCw, Filter, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { apiLogger, APILogEntry } from '../services/apiLogger';

interface DebugPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = React.memo(({ isOpen, onClose }) => {
    const [logs, setLogs] = useState<APILogEntry[]>([]);
    const [filter, setFilter] = useState<'all' | 'success' | 'error' | 'pending'>('all');
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [hidePollingLogs, setHidePollingLogs] = useState(true);  // 默认隐藏轮询日志
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 1500);
        });
    };

    // 加载日志
    const loadLogs = () => {
        const allLogs = apiLogger.getLogs();

        // 先按状态过滤
        let filteredLogs = filter === 'all'
            ? allLogs
            : apiLogger.filterLogs({ status: filter as APILogEntry['status'] });

        // 再过滤轮询日志（如果启用）
        if (hidePollingLogs) {
            filteredLogs = filteredLogs.filter(log => log.logType !== 'polling');
        }

        setLogs(filteredLogs);
    };

    // 自动刷新
    useEffect(() => {
        if (!isOpen || !autoRefresh) return;

        loadLogs();
        const interval = setInterval(loadLogs, 2000); // 每2秒刷新一次

        return () => clearInterval(interval);
    }, [isOpen, filter, autoRefresh, hidePollingLogs]);

    // 初始加载
    useEffect(() => {
        if (isOpen) {
            loadLogs();
        }
    }, [isOpen, filter, hidePollingLogs]);

    if (!isOpen) return null;

    const stats = apiLogger.getStats();

    const handleExport = () => {
        const dataStr = apiLogger.exportLogs();
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `api-logs-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleClear = () => {
        if (confirm('确定要清除所有日志吗？')) {
            apiLogger.clearLogs();
            loadLogs();
        }
    };

    const getStatusIcon = (status: APILogEntry['status']) => {
        switch (status) {
            case 'success': return <CheckCircle size={16} className="text-green-400" />;
            case 'error': return <XCircle size={16} className="text-red-400" />;
            case 'pending': return <Clock size={16} className="text-yellow-400 animate-pulse" />;
        }
    };

    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const formatDuration = (duration?: number) => {
        if (!duration) return '-';
        return duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`;
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
            <div className="w-[90vw] h-[85vh] bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-white">API 日志调试面板</h2>
                        <div className="flex gap-2 text-xs">
                            <span className="px-2 py-1 bg-white/10 rounded text-slate-300">
                                总计: {stats.total}
                            </span>
                            <span className="px-2 py-1 bg-green-500/20 rounded text-green-300">
                                成功: {stats.success}
                            </span>
                            <span className="px-2 py-1 bg-red-500/20 rounded text-red-300">
                                失败: {stats.error}
                            </span>
                            <span className="px-2 py-1 bg-yellow-500/20 rounded text-yellow-300">
                                进行中: {stats.pending}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="rounded"
                            />
                            自动刷新
                        </label>

                        <button
                            onClick={loadLogs}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-300"
                            title="刷新"
                        >
                            <RefreshCw size={18} />
                        </button>

                        <button
                            onClick={handleExport}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-300"
                            title="导出日志"
                        >
                            <Download size={18} />
                        </button>

                        <button
                            onClick={handleClear}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                            title="清除日志"
                        >
                            <Trash2 size={18} />
                        </button>

                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-300"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Filter */}
                <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5 bg-black/20">
                    <Filter size={16} className="text-slate-400" />
                    <div className="flex gap-2">
                        {(['all', 'success', 'error', 'pending'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                    filter === f
                                        ? 'bg-cyan-500 text-white'
                                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                            >
                                {f === 'all' ? '全部' : f === 'success' ? '成功' : f === 'error' ? '错误' : '进行中'}
                            </button>
                        ))}
                    </div>

                    {/* 隐藏轮询日志切换 */}
                    <label className="flex items-center gap-2 ml-auto text-xs text-slate-400 cursor-pointer hover:text-slate-300">
                        <input
                            type="checkbox"
                            checked={hidePollingLogs}
                            onChange={(e) => setHidePollingLogs(e.target.checked)}
                            className="rounded"
                        />
                        隐藏轮询查询
                    </label>
                </div>

                {/* Logs List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            <Clock size={48} className="mb-4 opacity-50" />
                            <p className="text-sm">暂无日志记录</p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-2">
                            {logs.map(log => (
                                <div
                                    key={log.id}
                                    className="bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition-colors"
                                >
                                    {/* Log Header */}
                                    <div
                                        className="flex items-center justify-between p-3 cursor-pointer"
                                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                    >
                                        <div className="flex items-center gap-3 flex-1">
                                            {getStatusIcon(log.status)}

                                            <div className="flex flex-col gap-1 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-white">
                                                        {log.apiName}
                                                    </span>
                                                    {log.platform && (
                                                        <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                                                            {log.platform}
                                                        </span>
                                                    )}
                                                    {log.nodeType && (
                                                        <span className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-300 rounded">
                                                            {log.nodeType}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                                    <span>{formatTimestamp(log.timestamp)}</span>
                                                    {log.duration && (
                                                        <span className="text-slate-500">
                                                            耗时: {formatDuration(log.duration)}
                                                        </span>
                                                    )}
                                                    {log.nodeId && (
                                                        <span className="text-slate-500 font-mono">
                                                            {log.nodeId.substring(0, 12)}...
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {expandedLogId === log.id ?
                                                <ChevronUp size={18} className="text-slate-400" /> :
                                                <ChevronDown size={18} className="text-slate-400" />
                                            }
                                        </div>
                                    </div>

                                    {/* Log Details (Expanded) */}
                                    {expandedLogId === log.id && (
                                        <div className="border-t border-white/10 bg-black/20 p-4 space-y-4">
                                            {/* Enhanced Prompt - 显示在最前面 */}
                                            {log.request.enhancedPrompt && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-cyan-400 mb-2 flex items-center gap-2">
                                                        <span>完整 Prompt (传给 AI)</span>
                                                        <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded text-[10px]">
                                                            {log.request.enhancedPrompt?.length || 0} 字符
                                                        </span>
                                                        <button onClick={() => handleCopy(log.request.enhancedPrompt || '', `prompt-${log.id}`)} className="ml-auto p-1 rounded hover:bg-white/10 transition-colors" title="复制">
                                                            {copiedKey === `prompt-${log.id}` ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="text-slate-400" />}
                                                        </button>
                                                    </h4>
                                                    <div className="bg-black/40 rounded p-3 max-h-96 overflow-y-auto custom-scrollbar">
                                                        <pre className="text-xs text-slate-200 whitespace-pre-wrap break-words font-mono">
                                                            {log.request.enhancedPrompt}
                                                        </pre>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Reference Images */}
                                            {log.request.inputImagesCount !== undefined && log.request.inputImagesCount > 0 && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-green-400 mb-2">
                                                        参考图数量
                                                    </h4>
                                                    <div className="bg-black/40 rounded p-3 text-xs text-green-300">
                                                        {log.request.inputImagesCount} 张参考图
                                                    </div>
                                                </div>
                                            )}

                                            {/* Request */}
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-2">
                                                    <span>请求配置</span>
                                                    <button onClick={() => handleCopy(JSON.stringify({ model: log.request.model, options: log.request.options, generationConfig: log.request.generationConfig }, null, 2), `req-${log.id}`)} className="ml-auto p-1 rounded hover:bg-white/10 transition-colors" title="复制">
                                                        {copiedKey === `req-${log.id}` ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="text-slate-400" />}
                                                    </button>
                                                </h4>
                                                <div className="bg-black/40 rounded p-3 text-xs text-slate-300 font-mono overflow-x-auto">
                                                    <pre>{JSON.stringify({
                                                        model: log.request.model,
                                                        options: log.request.options,
                                                        generationConfig: log.request.generationConfig
                                                    }, null, 2)}</pre>
                                                </div>
                                            </div>

                                            {/* Response Details */}
                                            {log.response?.details && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-purple-400 mb-2 flex items-center gap-2">
                                                        <span>响应详情</span>
                                                        <button onClick={() => handleCopy(JSON.stringify(log.response.details, null, 2), `detail-${log.id}`)} className="ml-auto p-1 rounded hover:bg-white/10 transition-colors" title="复制">
                                                            {copiedKey === `detail-${log.id}` ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="text-slate-400" />}
                                                        </button>
                                                    </h4>
                                                    <div className="bg-black/40 rounded p-3 text-xs text-slate-300 font-mono overflow-x-auto">
                                                        <pre>{JSON.stringify(log.response.details, null, 2)}</pre>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Response */}
                                            {log.response && !log.response.details && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-2">
                                                        <span>{log.status === 'error' ? '错误信息' : '响应数据'}</span>
                                                        <button onClick={() => handleCopy(JSON.stringify(log.response, null, 2), `resp-${log.id}`)} className="ml-auto p-1 rounded hover:bg-white/10 transition-colors" title="复制">
                                                            {copiedKey === `resp-${log.id}` ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="text-slate-400" />}
                                                        </button>
                                                    </h4>
                                                    <div className={`bg-black/40 rounded p-3 text-xs font-mono overflow-x-auto ${
                                                        log.status === 'error' ? 'text-red-300' : 'text-slate-300'
                                                    }`}>
                                                        <pre>{JSON.stringify(log.response, null, 2)}</pre>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Stats */}
                <div className="px-6 py-3 border-t border-white/10 bg-white/5 flex items-center justify-between text-xs text-slate-400">
                    <div>
                        平均耗时: {stats.avgDuration}ms
                    </div>
                    <div className="flex gap-3">
                        {Object.entries(stats.apiCounts).slice(0, 3).map(([api, count]) => (
                            <span key={api}>
                                {api}: {count}次
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
});
