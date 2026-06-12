import React, { useState } from 'react';

const Agent3Workspace = () => {
  const [messages, setMessages] = useState([
    { role: 'system', content: '系统已初始化。人才培养方案设计引擎（智能体3）就绪。请输入产业趋势或岗位需求，我将为您输出标准的《九宫格结构人才培养方案》。' }
  ]);
  const [input, setInput] = useState('');

  // 模拟调用你的 AI 后端
  const handleSend = () => {
    if (!input.trim()) return;
    
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');

    // 这里替换为你真实的后端 Fetch 逻辑
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'system', 
        content: `基于您的输入，已生成初步方案：\n1. 产业定位映射完成...\n2. 核心胜任力模型已匹配...\n[此处将展示你的后端 AI 真实返回内容]` 
      }]);
    }, 1000);
  };

  return (
    <div className="flex h-screen bg-[#050505] text-gray-300 font-sans tracking-wide overflow-hidden">
      
      {/* 左侧：全局导航外壳 (营造 MIS 整体感) */}
      <div className="w-64 border-r border-gray-800 bg-[#0a0a0a] flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-white font-bold text-lg tracking-widest">上海市物联网</h1>
          <h2 className="text-xs text-gray-500 mt-1 uppercase">数智化学习平台</h2>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            {['智能体1：人才发展报告', '智能体2：胜任力差距分析'].map(item => (
              <li key={item} className="px-6 py-3 text-sm text-gray-600 cursor-not-allowed">{item}</li>
            ))}
            {/* 当前激活的模块 */}
            <li className="px-6 py-3 text-sm font-semibold bg-[#F7C600]/10 text-[#F7C600] border-r-2 border-[#F7C600] cursor-pointer">
              智能体3：人才培养方案
            </li>
            {['智能体4：课程设计开发', '智能体5：评价题库生成', '智能体6：能力评估', '智能体7：Quiz模式'].map(item => (
              <li key={item} className="px-6 py-3 text-sm text-gray-600 cursor-not-allowed">{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 右侧：主体工作区 */}
      <div className="flex-1 flex flex-col">
        
        {/* 顶部标题栏 */}
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-8 bg-[#0a0a0a]">
          <h2 className="text-white text-lg font-medium">方案设计工作台</h2>
          <div className="flex items-center space-x-2 text-sm text-[#F7C600]">
            <span className="h-2 w-2 rounded-full bg-[#F7C600] animate-pulse"></span>
            <span>引擎在线</span>
          </div>
        </header>

        {/* 核心内容区 */}
        <div className="flex-1 flex p-6 gap-6 overflow-hidden">
          
          {/* 左半部分：业务逻辑展示面板 (提升专业度和古朴的结构感) */}
          <div className="w-1/2 flex flex-col space-y-6 overflow-y-auto pr-2 custom-scrollbar">
            
            <div className="bg-[#111] border border-gray-800 rounded p-6">
              <h3 className="text-[#F7C600] text-sm font-bold mb-2">核心定位</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                扮演“培养方案设计专家”角色，基于产业数据构建科学的人才培养体系。作为承上启下的枢纽，对接智能体4与6。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { title: '映射一', desc: '产业 ➔ 定位', detail: '分析区域产业需求趋势' },
                { title: '映射二', desc: '胜任力 ➔ 要求', detail: '解构岗位核心胜任力模型' },
                { title: '映射三', desc: '职责 ➔ 目标', detail: '梳理典型岗位工作任务' },
                { title: '映射四', desc: '课程 ➔ 能力', detail: '构建阶梯式课程体系' }
              ].map((map, idx) => (
                <div key={idx} className="bg-[#111] border border-gray-800 rounded p-5 hover:border-gray-600 transition-colors">
                  <div className="text-xs text-gray-500 mb-1">{map.title}</div>
                  <div className="text-white font-medium mb-2">{map.desc}</div>
                  <div className="text-xs text-gray-400">{map.detail}</div>
                </div>
              ))}
            </div>

            <div className="bg-[#111] border border-gray-800 rounded p-6">
              <h3 className="text-gray-400 text-sm mb-4">标准产出成果</h3>
              <div className="flex space-x-3">
                <span className="px-3 py-1 bg-gray-800 text-gray-300 rounded text-xs">《九宫格结构人才培养方案》</span>
                <span className="px-3 py-1 bg-gray-800 text-gray-300 rounded text-xs">《毕业要求-课程支撑矩阵表》</span>
              </div>
            </div>
          </div>

          {/* 右半部分：真正可用的 AI 问答终端 */}
          <div className="w-1/2 bg-[#0a0a0a] border border-gray-800 rounded flex flex-col relative shadow-2xl">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#111]">
              <span className="text-sm font-semibold text-white">交互生成终端</span>
              <span className="text-xs text-gray-500 font-mono">Terminal_v3.0</span>
            </div>
            
            {/* 对话列表 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-gray-600 mb-1 font-mono uppercase">{msg.role === 'user' ? 'Input' : 'Output'}</span>
                  <div className={`p-4 rounded max-w-[85%] text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-gray-800 text-white' 
                      : 'bg-[#F7C600]/10 border border-[#F7C600]/30 text-gray-200'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            {/* 输入区 */}
            <div className="p-4 border-t border-gray-800 bg-[#0a0a0a]">
              <div className="flex items-center bg-[#111] border border-gray-700 rounded overflow-hidden focus-within:border-[#F7C600] transition-colors">
                <span className="pl-4 text-[#F7C600] font-mono">{'>'}</span>
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="输入初始条件以启动方案生成..."
                  className="flex-1 bg-transparent border-none text-white p-3 focus:outline-none text-sm placeholder-gray-600"
                />
                <button 
                  onClick={handleSend}
                  className="px-6 py-3 bg-gray-800 hover:bg-[#F7C600] text-gray-400 hover:text-[#050505] font-medium transition-colors text-sm"
                >
                  运行
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Agent3Workspace;