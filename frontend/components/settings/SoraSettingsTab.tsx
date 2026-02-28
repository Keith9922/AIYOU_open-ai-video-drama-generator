import React, { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, HelpCircle, Wand2 } from 'lucide-react';
import {
  getSoraStorageConfig, saveSoraStorageConfig,
  getOSSConfig, saveOSSConfig,
  getSoraProvider, getYunwuApiKey, getDayuapiApiKey,
  getKieApiKey, saveKieApiKey,
  getVideoPlatformApiKey, saveVideoPlatformApiKey,
  getYijiapiApiKey, saveYijiapiApiKey
} from '../../services/soraConfigService';
import { testOSSConnection } from '../../services/ossService';
import { OSSConfig } from '../../types';
import { OSSHelpModal } from './OSSHelpModal';

type SoraProviderType = 'sutu' | 'yunwu' | 'dayuapi' | 'kie' | 'yijiapi';

interface SoraSettingsTabProps {
  onClose: () => void;
}

export const SoraSettingsTab: React.FC<SoraSettingsTabProps> = React.memo(({ onClose }) => {
  const [soraProvider, setSoraProviderState] = useState<SoraProviderType>('sutu');
  const [soraApiKey, setSoraApiKey] = useState('');
  const [yunwuApiKey, setYunwuApiKey] = useState('');
  const [dayuapiApiKey, setDayuapiApiKey] = useState('');
  const [kieApiKey, setKieApiKey] = useState('');
  const [yijiapiApiKey, setYijiapiApiKey] = useState('');
  const [ossConfig, setOssConfig] = useState<OSSConfig>({
    provider: 'imgbb',
    imgbbApiKey: '',
    imgbbExpiration: 86400,
    bucket: '',
    region: '',
    accessKey: '',
    secretKey: ''
  });

  const [showSoraApiKey, setShowSoraApiKey] = useState(false);
  const [showYunwuApiKey, setShowYunwuApiKey] = useState(false);
  const [showDayuapiApiKey, setShowDayuapiApiKey] = useState(false);
  const [showKieApiKey, setShowKieApiKey] = useState(false);
  const [showYijiapiApiKey, setShowYijiapiApiKey] = useState(false);
  const [showOssHelp, setShowOssHelp] = useState(false);

  const [yunwuapiPlatformKey, setYunwuapiPlatformKey] = useState('');
  const [showYunwuapiPlatformKey, setShowYunwuapiPlatformKey] = useState(false);

  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedSoraConfig = getSoraStorageConfig();
    if (savedSoraConfig?.apiKey) setSoraApiKey(savedSoraConfig.apiKey);

    setSoraProviderState(getSoraProvider());

    const savedYunwuKey = getYunwuApiKey();
    if (savedYunwuKey) setYunwuApiKey(savedYunwuKey);

    const savedDayuapiKey = getDayuapiApiKey();
    if (savedDayuapiKey) setDayuapiApiKey(savedDayuapiKey);

    const savedKieKey = getKieApiKey();
    if (savedKieKey) setKieApiKey(savedKieKey);

    const savedYijiapiKey = getYijiapiApiKey();
    if (savedYijiapiKey) setYijiapiApiKey(savedYijiapiKey);

    const savedPlatformKey = getVideoPlatformApiKey('yunwuapi');
    if (savedPlatformKey) setYunwuapiPlatformKey(savedPlatformKey);

    const savedOssConfig = getOSSConfig();
    if (savedOssConfig) setOssConfig(savedOssConfig);
  }, []);

  const handleSave = useCallback(() => {
    const savedConfig = getSoraStorageConfig();
    saveSoraStorageConfig({
      ...savedConfig,
      provider: soraProvider,
      apiKey: soraProvider === 'sutu' ? soraApiKey : savedConfig.apiKey,
      sutuApiKey: soraProvider === 'sutu' ? soraApiKey : savedConfig.sutuApiKey,
      yunwuApiKey,
      dayuapiApiKey,
      kieApiKey,
      yijiapiApiKey,
    });
    saveOSSConfig(ossConfig);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    setTimeout(onClose, 500);
  }, [soraProvider, soraApiKey, yunwuApiKey, dayuapiApiKey, kieApiKey, yijiapiApiKey, ossConfig, onClose]);

  const providerDescriptions: Record<SoraProviderType, string> = {
    sutu: '速创 API：支持 Sora2 标准版和 Pro 版，根据高清开关自动选择',
    yunwu: '云雾 API：新增接口，稳定性较好',
    dayuapi: '大洋芋 API：通过模型名称控制参数，支持 10/15/25 秒视频',
    kie: 'KIE AI API：支持图生视频和文生视频，参数通过 input 对象传递',
    yijiapi: '一加API：支持文生视频，使用 size 参数控制分辨率',
  };

  const providerConfigs: Array<{
    key: SoraProviderType;
    label: string;
    value: string;
    setValue: (v: string) => void;
    show: boolean;
    setShow: (v: boolean) => void;
    placeholder: string;
    linkText: string;
    linkUrl: string;
    linkColor: string;
  }> = [
    { key: 'sutu', label: '速创 API Key', value: soraApiKey, setValue: setSoraApiKey, show: showSoraApiKey, setShow: setShowSoraApiKey, placeholder: '输入速创 API Key', linkText: '速创API官网 (api.wuyinkeji.com)', linkUrl: 'https://api.wuyinkeji.com/', linkColor: 'text-green-400' },
    { key: 'yunwu', label: '云雾 API Key', value: yunwuApiKey, setValue: setYunwuApiKey, show: showYunwuApiKey, setShow: setShowYunwuApiKey, placeholder: '输入云雾 API Key', linkText: '云雾官网', linkUrl: 'https://yunwu.ai', linkColor: 'text-blue-400' },
    { key: 'dayuapi', label: '大洋芋 API Key', value: dayuapiApiKey, setValue: setDayuapiApiKey, show: showDayuapiApiKey, setShow: setShowDayuapiApiKey, placeholder: '输入大洋芋 API Key', linkText: '大洋芋官网', linkUrl: 'https://api.dyuapi.com', linkColor: 'text-blue-400' },
    { key: 'kie', label: 'KIE AI API Key', value: kieApiKey, setValue: setKieApiKey, show: showKieApiKey, setShow: setShowKieApiKey, placeholder: '输入 KIE AI API Key', linkText: 'KIE AI 官网', linkUrl: 'https://kie.ai', linkColor: 'text-blue-400' },
    { key: 'yijiapi', label: '一加API Key', value: yijiapiApiKey, setValue: setYijiapiApiKey, show: showYijiapiApiKey, setShow: setShowYijiapiApiKey, placeholder: '输入一加API Key', linkText: '一加API官网', linkUrl: 'https://ai.yijiarj.cn', linkColor: 'text-blue-400' },
  ];

  const activeProvider = providerConfigs.find(p => p.key === soraProvider);

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Sora 2 API 配置
          </h3>
          <p className="text-[11px] text-slate-400">
            选择 API 提供商并配置对应的 API Key，系统将根据选择自动调用相应的服务
          </p>
        </div>

        {/* API 提供商选择 */}
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-300">API 提供商</span>
          </label>
          <select
            value={soraProvider}
            onChange={(e) => setSoraProviderState(e.target.value as SoraProviderType)}
            className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-green-500/50"
          >
            <option value="sutu">速创 API (Sinco)</option>
            <option value="yunwu">云雾 API (Yunwu)</option>
            <option value="dayuapi">大洋芋 API (Dayuapi)</option>
            <option value="kie">KIE AI API</option>
            <option value="yijiapi">一加API (Yijia)</option>
          </select>
          <p className="text-[10px] text-slate-500">{providerDescriptions[soraProvider]}</p>
        </div>

        {/* 当前提供商 API Key */}
        {activeProvider && (
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-300">{activeProvider.label}</span>
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={activeProvider.show ? 'text' : 'password'}
                  value={activeProvider.value}
                  onChange={(e) => activeProvider.setValue(e.target.value)}
                  placeholder={activeProvider.placeholder}
                  className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50"
                />
                <button
                  onClick={() => activeProvider.setShow(!activeProvider.show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {activeProvider.show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              在 <a href={activeProvider.linkUrl} target="_blank" rel="noopener noreferrer" className={`${activeProvider.linkColor} hover:underline`}>{activeProvider.linkText}</a> 获取 API Key
            </p>
          </div>
        )}

        {/* 视频平台 API Keys */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <Wand2 size={16} className="text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">视频平台 API Keys</h3>
              <p className="text-[11px] text-slate-400">
                用于分镜视频生成节点的多模型平台配置
              </p>
            </div>
          </div>

          <div className="p-4 bg-black/40 border border-white/10 rounded-xl space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-300">云雾API平台 Key</span>
              <span className="text-xs text-slate-500 ml-2">(支持 Veo/Luma/Runway/海螺/豆包/Grok/通义/Sora)</span>
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showYunwuapiPlatformKey ? 'text' : 'password'}
                  value={yunwuapiPlatformKey}
                  onChange={(e) => setYunwuapiPlatformKey(e.target.value)}
                  onBlur={() => saveVideoPlatformApiKey('yunwuapi', yunwuapiPlatformKey)}
                  placeholder="输入云雾API平台 Key"
                  className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                />
                <button
                  onClick={() => setShowYunwuapiPlatformKey(!showYunwuapiPlatformKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showYunwuapiPlatformKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              在 <a href="https://yunwu.ai" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">云雾API官网</a> 获取平台 Key（支持8个主流视频生成模型）
            </p>
          </div>

          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <p className="text-[10px] text-slate-400">
              视频平台 API Keys 与 Sora 2 API Key 分开管理，用于分镜视频生成节点的多平台多模型支持
            </p>
          </div>
        </div>

        {/* API 提供商说明 */}
        <div className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
          <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <HelpCircle size={16} className="text-blue-400" />
            API 提供商说明
          </h4>
          <div className="space-y-2 text-xs text-slate-300">
            {[
              { color: 'bg-yellow-500', name: '速创 API (Sinco)', desc: '支持 Sora2 标准版（10/15秒）和 Pro 版（15/25秒高清），根据高清开关自动选择', link: 'https://api.wuyinkeji.com/', linkText: '查看 API 文档' },
              { color: 'bg-green-500', name: '云雾 API (Yunwu)', desc: '新增接口，稳定性较好，推荐使用' },
              { color: 'bg-purple-500', name: '大洋芋 API (Dayuapi)', desc: '通过模型名称控制参数，支持 10/15/25 秒视频，25 秒自动使用高清模式' },
              { color: 'bg-orange-500', name: 'KIE AI API', desc: '支持图生视频和文生视频，参数包装在 input 对象中，支持角色动画集成' },
              { color: 'bg-pink-500', name: '一加API (Yijia)', desc: '支持文生视频，使用 size 参数控制分辨率（如 1280x720），支持多种时长和比例' },
            ].map(item => (
              <div key={item.name} className="flex items-start gap-2">
                <div className={`w-2 h-2 ${item.color} rounded-full mt-1 flex-shrink-0`} />
                <div>
                  <p className="font-medium text-white">{item.name}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{item.desc}</p>
                  {item.link && (
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">{item.linkText}</a>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            提示：您可以随时切换提供商，每个提供商的 API Key 独立保存
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="relative flex items-center justify-between px-6 py-4 border-t border-white/5 bg-[#121214]">
        <div />
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className={`px-6 py-2.5 text-sm font-medium transition-all rounded-xl ${
              isSaved
                ? 'bg-green-500 text-white'
                : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-400 hover:to-emerald-400 shadow-lg hover:shadow-green-500/25'
            }`}
          >
            {isSaved ? '✓ 已保存' : '保存配置'}
          </button>
        </div>
      </div>

      <OSSHelpModal isOpen={showOssHelp} onClose={() => setShowOssHelp(false)} />
    </>
  );
});
