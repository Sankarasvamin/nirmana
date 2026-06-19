import React, { useState } from 'react';

// === 核心数据字典：提取自各 PPT 画面的真实业务逻辑 ===
const SYSTEM_AGENTS = {
  agent1: {
    id: 'agent1',
    menuName: '智能体 1：人才发展报告',
    title: '产业与人才发展报告引擎',
    role: '产业需求分析师',
    desc: '基于产业视角，深度挖掘人才供需规律与发展趋势的核心分析专家。为后续所有智能体提供标准化的产业基准数据与人才参考模型。',
    panels: [
      { title: '核心输入源 (Inputs)', items: ['权威行业报告：宏观市场数据与发展预测', '企业招聘画像：海量真实JD的结构化解析', '产业演进趋势：技术迭代与岗位变迁数据'] },
      { title: '核心处理流程 (Process)', items: ['01. 分析：行业与技术解构', '02. 梳理：重点企业与岗位映射', '03. 分解：岗位KSA能力要素', '04. 输出：全景职业能力图谱'] }
    ],
    outputs: ['标准化人才报告', '行业胜任力模型', 'AI 评分基准'],
    terminalState: 'standby', // 待机状态
    systemLogs: [
      '[System] 正在连接外部行业数据库...',
      '[Data] 已拉取 14,500 份有效岗位 JD.',
      '[Process] KSA 提取算法运行中，当前进度 87%...'
    ]
  },
  agent2: {
    id: 'agent2',
    menuName: '智能体 2：胜任力差距分析',
    title: '胜任力动态差距分析工作台',
    role: '差距评估专家',
    desc: '专注能力现状与未来需求的动态评估。为智能体3进行培养方案的动态优化提供核心数据支撑，并赋能智能体6构建精准的学习者画像。',
    panels: [
      { title: '核心量化模型', items: ['动态差距分 = 基础差距分 × 基础权重 + 预测差距分 × 预测权重', '期望差距模型：E[G] = P(base)·W_b + P(pred)·W_p'] },
      { title: '差异化应用策略', items: ['高暴露职业：侧重预测差距，提前布局未来能力储备。', '低暴露职业：侧重当前差距，优先解决现有能力短板。'] }
    ],
    outputs: ['识别缺失关键技能', '界定需更新技能项', '输出综合差距等级图谱'],
    terminalState: 'standby',
    systemLogs: [
      '[Analytics] 正在载入学习者能力基线...',
      '[Model] 动态差距模型已应用 (权重配置: base=0.6, pred=0.4).',
      '[Result] 发现高暴露职业技能短板：物联网边缘计算架构.'
    ]
  },
  agent3: {
    id: 'agent3',
    menuName: '智能体 3：人才培养方案',
    title: '方案设计与生成工作台',
    role: '方案设计核心枢纽',
    desc: '扮演“培养方案设计专家”角色，基于产业数据构建科学的人才培养体系。作为系统承上启下的枢纽，直接为智能体4提供顶层规划依据。',
    panels: [
      { title: '核心映射逻辑', items: ['映射一 (产业 ➔ 定位)：分析区域产业需求，精准锁定专业建设定位', '映射二 (胜任力 ➔ 要求)：解构核心胜任力模型，转化为毕业要求指标', '映射三 (职责 ➔ 目标)：梳理典型工作任务，制定清晰人才培养目标', '映射四 (课程 ➔ 能力)：构建阶梯式课程体系，实现动态匹配'] }
    ],
    outputs: ['《九宫格结构人才培养方案》', '《毕业要求-课程支撑矩阵表》', '配套考核规范与指引'],
    terminalState: 'active', // 唯一可交互状态
    systemLogs: [
      '[System] 智能体 3 引擎已就绪。等待用户输入指令...'
    ]
  },
  agent4: {
    id: 'agent4',
    menuName: '智能体 4：课程设计开发',
    title: '课程体系规划与资源开发',
    role: '课程资源设计师',
    desc: '作为连接培养方案与落地教学的核心枢纽，负责将抽象的培养目标转化为具体、可执行的课程体系与教学资源。',
    panels: [
      { title: '核心设计流程', items: ['① 深度解析与接收专业培养方案', '② 规划课程体系架构与学分分配', '③ 针对性开发配套教学资源与课件', '④ 设计多维度的课程质量评估方案'] },
      { title: '跨智能体协同', items: ['向智能体5提供精准的课程考核范围与知识点权重。', '向智能体7输出具体的教学素材需求清单。'] }
    ],
    outputs: ['标准课程教学大纲', '结构化教学资源包', '可视化课程地图'],
    terminalState: 'standby',
    systemLogs: [
      '[Fetch] 正在获取智能体3下发的《支撑矩阵表》...',
      '[Parse] 学分分配模型运行完毕。',
      '[Standby] 等待人工审核前置方案以启动课件生成。'
    ]
  },
  agent5: {
    id: 'agent5',
    menuName: '智能体 5：评价题库生成',
    title: '标准化题库生成实验室',
    role: '能力评价专家',
    desc: '基于行业标准与岗位能力模型，构建标准化的题库生成体系，为学习者能力的科学、客观评估提供核心支撑。',
    panels: [
      { title: '题库覆盖类型与流程', items: ['理论知识题库：9步标准化闭环生成流程。', '操作技能题库：14步项目化任务拆解生成。'] },
      { title: '协同联动 (Quiz模式)', items: ['为智能体7提供实时交互所需的理论题库数据。', '为智能体6提供标准化的评分标准与基准数据。'] }
    ],
    outputs: ['标准化试题单 (JSON格式)', '规范答题卷及解析', '多维度评分细则表'],
    terminalState: 'standby',
    systemLogs: [
      '[Builder] 9步闭环生成引擎挂起...',
      '[Database] 当前知识库向量化索引已达 450,210 条。',
      '[System] 准备接收操作技能拆解任务。'
    ]
  }
};

const MISInterface = () => {
  const [activeTab, setActiveTab] = useState('agent3');
  const [messages, setMessages] = useState([
    { role: 'system', content: '人才培养方案设计引擎（智能体3）就绪。请输入产业趋势或岗位需求，我将为您输出标准的《九宫格结构人才培养方案》。' }
  ]);
  const [input, setInput] = useState('');

  const currentAgent = SYSTEM_AGENTS[activeTab];

  const handleSend = () => {
    if (!input.trim() || currentAgent.terminalState !== 'active') return;
    
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');

    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'system', 
        content: `【指令确认】正在处理您的需求...\n1. 映射一加载：已锁定物联网底层架构方向\n2. 映射二加载：正在匹配《硬件开发KSA基准模型》...\n\n[方案草案已在后台生成，输入 "export" 下载支撑矩阵表]` 
      }]);
    }, 1200);
  };

  return (
    <div className="flex h-screen bg-[#050505] text-gray-300 font-sans tracking-wide overflow-hidden selection:bg-[#F7C600] selection:text-black">
      
      {/* 侧边导航栏 */}
      <div className="w-72 border-r border-gray-800 bg-[#0a0a0a] flex flex-col z-10 shadow-2xl">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 bg-[#F7C600] flex items-center justify-center font-bold text-black text-xs rounded-sm">IoT</div>
            <div>
              <h1 className="text-white font-bold text-sm tracking-widest">上海市物联网行业协会</h1>
              <h2 className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">数智化学习平台 MIS</h2>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-6 space-y-1 custom-scrollbar">
          <div className="px-6 text-[10px] text-gray-600 font-mono mb-2">CORE AGENTS</div>
          {Object.values(SYSTEM_AGENTS).map(agent => (
            <div 
              key={agent.id}
              onClick={() => setActiveTab(agent.id)}
              className={`px-6 py-3 text-sm transition-all duration-200 border-l-4 cursor-pointer flex justify-between items-center ${
                activeTab === agent.id 
                  ? 'bg-[#1a1a1a] text-white border-[#F7C600]' 
                  : 'text-gray-500 border-transparent hover:bg-[#111] hover:text-gray-300'
              }`}
            >
              <span className="font-medium">{agent.menuName}</span>
              {agent.terminalState === 'active' && activeTab === agent.id && (
                <span className="w-2 h-2 rounded-full bg-[#F7C600] animate-pulse"></span>
              )}
            </div>
          ))}
        </div>
        <div className="p-6 border-t border-gray-800 text-xs text-gray-600 font-mono">
          System Version: v2.4.1_Build904
        </div>
      </div>

      {/* 主体工作区 */}
      <div className="flex-1 flex flex-col relative bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDUwNTA1Ij48L3JlY3Q+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMwYTBhMGEiPjwvcmVjdD4KPC9zdmc+')]">
        
        {/* 顶部标题栏 */}
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-8 bg-[#0a0a0a]/90 backdrop-blur-sm z-10">
          <div className="flex items-center space-x-4">
            <h2 className="text-white text-lg font-bold tracking-wide">{currentAgent.title}</h2>
            <span className="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded border border-gray-700 font-mono">ID: {currentAgent.id.toUpperCase()}</span>
          </div>
          <div className="flex items-center space-x-4 font-mono text-xs">
            <div className={`flex items-center space-x-2 ${currentAgent.terminalState === 'active' ? 'text-[#F7C600]' : 'text-gray-500'}`}>
              <span>{currentAgent.terminalState === 'active' ? 'ENGINE: ONLINE' : 'ENGINE: STANDBY'}</span>
            </div>
            <div className="text-gray-600">|</div>
            <div className="text-gray-400">NODE: SH-01</div>
          </div>
        </header>

        {/* 核心内容区 */}
        <div className="flex-1 flex p-8 gap-8 overflow-hidden z-10">
          
          {/* 左侧：业务模型与元数据 (Data Panel) */}
          <div className="w-[45%] flex flex-col space-y-6 overflow-y-auto pr-4 custom-scrollbar">
            
            <div className="bg-[#111] border border-gray-800 rounded-sm p-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-gray-700 group-hover:bg-[#F7C600] transition-colors"></div>
              <h3 className="text-white text-sm font-bold mb-1">核心角色定位</h3>
              <div className="text-[#F7C600] text-xs font-mono mb-3 uppercase">{currentAgent.role}</div>
              <p className="text-gray-400 text-sm leading-relaxed">{currentAgent.desc}</p>
            </div>

            {currentAgent.panels.map((panel, idx) => (
              <div key={idx} className="bg-[#0a0a0a] border border-gray-800 rounded-sm p-6">
                <h3 className="text-gray-300 text-sm font-bold mb-4 flex items-center">
                  <span className="w-1.5 h-1.5 bg-gray-600 mr-2 rounded-none"></span>
                  {panel.title}
                </h3>
                <ul className="space-y-3">
                  {panel.items.map((item, i) => (
                    <li key={i} className="text-sm text-gray-400 pl-4 border-l border-gray-800 relative before:content-[''] before:absolute before:left-0 before:top-2 before:w-2 before:h-[1px] before:bg-gray-800">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="bg-[#111] border border-[#F7C600]/30 rounded-sm p-6">
              <h3 className="text-[#F7C600] text-sm font-bold mb-4 uppercase tracking-widest text-[10px]">Standard Outputs</h3>
              <div className="flex flex-wrap gap-2">
                {currentAgent.outputs.map((out, idx) => (
                  <span key={idx} className="px-3 py-1.5 bg-[#1a1a1a] border border-gray-700 text-gray-300 rounded-sm text-xs shadow-inner">
                    {out}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧：操作终端与交互区 (Terminal Workspace) */}
          <div className="w-[55%] flex flex-col h-full bg-[#050505] border border-gray-800 shadow-2xl relative rounded-sm">
            
            {/* Terminal Header */}
            <div className="h-10 border-b border-gray-800 flex items-center justify-between px-4 bg-[#0a0a0a]">
              <div className="flex space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-900/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-900/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-900/50"></div>
              </div>
              <span className="text-xs text-gray-600 font-mono tracking-widest uppercase">
                {currentAgent.terminalState === 'active' ? 'Interactive_Shell' : 'Read_Only_Log'}
              </span>
            </div>
            
            {/* Terminal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-sm custom-scrollbar">
              
              {/* 非激活状态：显示只读日志 */}
              {currentAgent.terminalState !== 'active' && (
                <div className="space-y-2 opacity-70">
                  <div className="text-gray-500 mb-6"># Module locked by system. Waiting for upstream trigger.</div>
                  {currentAgent.systemLogs.map((log, idx) => (
                    <div key={idx} className="text-gray-400">
                      <span className="text-gray-600 mr-3">[{new Date().toISOString().split('T')[1].slice(0,8)}]</span>
                      {log}
                    </div>
                  ))}
                  <div className="text-gray-500 mt-4 animate-pulse">_</div>
                </div>
              )}

              {/* 激活状态：显示 AI 对话 */}
              {currentAgent.terminalState === 'active' && messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col mb-6 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className={`text-[10px] mb-1 uppercase tracking-widest ${msg.role === 'user' ? 'text-gray-500' : 'text-[#F7C600]'}`}>
                    {msg.role === 'user' ? 'User_Input' : 'System_Output'}
                  </span>
                  <div className={`p-4 max-w-[90%] text-[13px] leading-relaxed font-sans ${
                    msg.role === 'user' 
                      ? 'bg-[#1a1a1a] text-white border border-gray-700' 
                      : 'bg-[#F7C600]/5 border border-[#F7C600]/20 text-gray-300'
                  }`}>
                    {msg.content.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}<br/>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Terminal Input - 仅在激活态可用 */}
            <div className={`p-4 border-t border-gray-800 bg-[#0a0a0a] transition-opacity ${currentAgent.terminalState === 'active' ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
              <div className="flex items-center bg-[#111] border border-gray-700 focus-within:border-[#F7C600] transition-colors shadow-inner">
                <span className="pl-4 text-[#F7C600] font-mono text-lg">{'>'}</span>
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={currentAgent.terminalState === 'active' ? "输入初始条件以启动方案生成..." : "SYSTEM LOCKED"}
                  disabled={currentAgent.terminalState !== 'active'}
                  className="flex-1 bg-transparent border-none text-white p-3 focus:outline-none text-sm font-mono placeholder-gray-700"
                />
                <button 
                  onClick={handleSend}
                  disabled={currentAgent.terminalState !== 'active'}
                  className="px-6 py-3 bg-[#1a1a1a] hover:bg-[#F7C600] text-gray-400 hover:text-black font-bold tracking-widest transition-colors text-xs uppercase"
                >
                  Execute
                </button>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default MISInterface;