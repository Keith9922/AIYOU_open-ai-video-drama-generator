import React from 'react';
import { X, AlertCircle } from 'lucide-react';

interface OSSHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OSSHelpModal: React.FC<OSSHelpModalProps> = React.memo(({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[300] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-3xl bg-[#1c1c1e] rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-h-[85vh] flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
          <div>
            <h3 className="text-base font-bold text-white">OSS 配置指南</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">以阿里云 OSS 为例，其他云服务商配置类似</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {/* 为什么需要 OSS */}
          <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <h4 className="text-sm font-bold text-blue-400 mb-2">为什么需要配置 OSS？</h4>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Sora API 需要通过公网 URL 访问您的参考图片。OSS（对象存储服务）可以将本地图片上传到云端，
              生成可公开访问的 URL，供 Sora API 使用。如果不配置 OSS，图生视频功能将无法使用。
            </p>
          </div>

          {/* 配置步骤 */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white">配置步骤</h4>

            <div className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
              <div className="flex-1">
                <p className="text-xs text-white font-medium">注册阿里云账号</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  访问 <a href="https://www.aliyun.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">阿里云官网</a> 注册并完成实名认证
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
              <div className="flex-1">
                <p className="text-xs text-white font-medium">创建 OSS Bucket</p>
                <div className="mt-2 p-3 bg-black/30 rounded-lg space-y-1.5 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-20">Bucket 名称:</span>
                    <span className="text-white">自定义名称（如 my-sora-images）</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-20">地域:</span>
                    <span className="text-white">选择离您最近的地域</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-20">存储类型:</span>
                    <span className="text-white">标准存储</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-20">读写权限:</span>
                    <span className="text-white font-bold text-yellow-400">公共读</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
              <div className="flex-1">
                <p className="text-xs text-white font-medium">创建 AccessKey</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  进入 RAM 访问控制 → 用户 → 创建用户 → 勾选 OpenAPI 调用访问 → 添加 AliyunOSSFullAccess 权限
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center text-[10px] font-bold">4</span>
              <div className="flex-1">
                <p className="text-xs text-white font-medium">配置跨域规则（CORS）</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  在 Bucket 设置 → 权限管理 → 跨域设置 中添加规则：
                </p>
                <div className="mt-2 p-3 bg-black/30 rounded-lg space-y-1.5 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-24">来源:</span>
                    <span className="text-white">*（或指定您的域名）</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-24">允许 Methods:</span>
                    <span className="text-white">GET, HEAD, PUT</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-24">允许 Headers:</span>
                    <span className="text-white">*</span>
                  </div>
                </div>
                <p className="text-[9px] text-yellow-400 mt-1">
                  不配置 CORS 也可以使用，但无法在浏览器中预览上传的图片
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center text-[10px] font-bold">5</span>
              <div className="flex-1">
                <p className="text-xs text-white font-medium">填写配置信息</p>
                <div className="mt-2 p-3 bg-black/30 rounded-lg space-y-1.5 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-20">服务提供商:</span>
                    <span className="text-white">阿里云 OSS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-20">Bucket 名称:</span>
                    <span className="text-white">创建的 Bucket 名称（如 my-bucket）</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-20">区域:</span>
                    <span className="text-white">地域节点（如 oss-cn-shenzhen）</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-20">Access Key:</span>
                    <span className="text-white">AccessKey ID</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-20">Secret Key:</span>
                    <span className="text-white">AccessKey Secret</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 注意事项 */}
          <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
            <h4 className="text-sm font-bold text-yellow-400 mb-2 flex items-center gap-2">
              <AlertCircle size={16} />
              重要注意事项
            </h4>
            <ul className="space-y-1.5 text-[10px] text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">•</span>
                <span>请妥善保管 AccessKey 和 SecretKey，不要泄露给他人</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">•</span>
                <span>建议创建 RAM 子账号并授予 OSS 读写权限，不要使用主账号密钥</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">•</span>
                <span>Bucket 访问权限建议设置为"公共读"，以便 Sora API 可以访问图片</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">•</span>
                <span>不同云服务商的区域代码格式不同，请仔细核对</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-white/5 bg-[#121214]">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 rounded-xl transition-all"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
});
